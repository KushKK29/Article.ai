"""
Unified LLM client — lets a service pick its provider/model explicitly in code.

Usage (in any service file):

    from services.llm_client import LLMClient

    LLM_PROVIDER = "gemini"              # "gemini" | "openrouter" | "nvidia"
    LLM_MODEL = "gemini-3-flash-preview"

    client = LLMClient(LLM_PROVIDER, LLM_MODEL)
    response = client.generate(prompt, temperature=0.5, json_mode=True)
    response.text

Provider docs / model catalogs:
  - Gemini:     https://ai.google.dev/gemini-api/docs/models
  - OpenRouter: https://openrouter.ai/models   (model id, e.g. "openai/gpt-4o-mini")
  - NVIDIA NIM: https://build.nvidia.com/models (model id, e.g. "meta/llama-3.1-70b-instruct")
"""

import os
import re
import json
import time
import logging
from google import genai
from google.genai import types
from openai import OpenAI

logger = logging.getLogger(__name__)

PROVIDER_CONFIG = {
    "gemini": {
        "api_key_env": "GEMINI_API_KEY",
        "base_url": None,
    },
    "openrouter": {
        "api_key_env": "OPENROUTER_API_KEY",
        "base_url": "https://openrouter.ai/api/v1",
    },
    "nvidia": {
        "api_key_env": "NVIDIA_API_KEY",
        "base_url": "https://integrate.api.nvidia.com/v1",
    },
    "qwen": {
        "api_key_env": "QWEN_API_KEY",
        # DashScope OpenAI-compatible endpoint (international). Override with
        # QWEN_BASE_URL if your key is for the mainland-China region.
        "base_url": os.getenv("QWEN_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
    },
}


class LLMResponse:
    def __init__(self, text: str, finish_reason: str = ""):
        self.text = text
        self.finish_reason = finish_reason

    @property
    def truncated(self) -> bool:
        """True when the model stopped because it hit the output-token limit."""
        return "MAX_TOKENS" in self.finish_reason.upper() or self.finish_reason == "length"


def default_model_for(provider: str) -> str:
    return {
        "gemini": "gemini-3-flash-preview",
        "qwen": os.getenv("QWEN_MODEL", "qwen-plus"),
        # openrouter/free auto-routes to whichever free models are live,
        # filtering for JSON/structured-output support per request.
        "openrouter": os.getenv("OPENROUTER_MODEL", "openrouter/free"),
        "nvidia": os.getenv("NVIDIA_MODEL", "moonshotai/kimi-k2.6"),
    }.get(provider, "")


# Fallback chain, built lazily from whichever provider keys are configured.
# Order: OpenRouter -> NVIDIA -> Qwen. None = not yet resolved.
_fallback_clients: "list[LLMClient] | None" = None


def _get_fallback_clients() -> "list[LLMClient]":
    global _fallback_clients
    if _fallback_clients is None:
        clients = []
        for provider in ("openrouter", "nvidia", "qwen"):
            if os.getenv(PROVIDER_CONFIG[provider]["api_key_env"]):
                clients.append(LLMClient(provider, default_model_for(provider)))
        _fallback_clients = clients
        if clients:
            logger.info(
                "LLM fallback chain: %s",
                " -> ".join(f"{c.provider}/{c.model}" for c in clients),
            )
    return _fallback_clients


class LLMClient:
    """Thin wrapper so callers write one `generate()` call regardless of provider."""

    def __init__(self, provider: str, model: str):
        if provider not in PROVIDER_CONFIG:
            raise ValueError(f"Unknown LLM provider '{provider}'. Choose one of: {list(PROVIDER_CONFIG)}")

        cfg = PROVIDER_CONFIG[provider]
        api_key = os.getenv(cfg["api_key_env"])
        if not api_key:
            raise ValueError(f"{cfg['api_key_env']} is not set — required for provider '{provider}'")

        self.provider = provider
        self.model = model

        if provider == "gemini":
            self._client = genai.Client(api_key=api_key)
        else:
            self._client = OpenAI(api_key=api_key, base_url=cfg["base_url"])

    def _call_with_retry(self, fn, attempts: int = 3, base_delay: float = 30):
        """
        Retry transient provider errors (429 rate limit / 503 overloaded) with
        linear backoff, so a short Gemini demand spike doesn't fail a whole job.
        Both google-genai (.code) and openai (.status_code) errors are covered.
        """
        for attempt in range(attempts):
            try:
                return fn()
            except Exception as e:
                code = getattr(e, "code", None) or getattr(e, "status_code", None)
                if code not in (429, 503) or attempt == attempts - 1:
                    raise
                delay = base_delay * (attempt + 1)
                logger.warning(
                    "LLM provider returned %s (attempt %d/%d); retrying in %.0fs.",
                    code, attempt + 1, attempts, delay,
                )
                time.sleep(delay)

    def generate(
        self,
        prompt: str,
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_output_tokens: int | None = None,
        json_mode: bool = False,
    ) -> LLMResponse:
        """
        Generate with the primary provider; on exhausted transient/server
        errors (429/5xx), walk the fallback chain (OpenRouter -> NVIDIA ->
        Qwen — whichever have API keys configured).
        """
        try:
            return self._generate_raw(
                prompt, model=model, temperature=temperature,
                max_output_tokens=max_output_tokens, json_mode=json_mode,
            )
        except Exception as e:
            code = getattr(e, "code", None) or getattr(e, "status_code", None)
            if code not in (429, 500, 502, 503):
                raise
            last_error: Exception = e
            for fallback in _get_fallback_clients():
                if fallback.provider == self.provider:
                    continue
                logger.warning(
                    "Provider '%s' failed with %s; falling back to %s/%s.",
                    self.provider, code, fallback.provider, fallback.model,
                )
                try:
                    return fallback._generate_raw(
                        prompt, temperature=temperature,
                        max_output_tokens=max_output_tokens, json_mode=json_mode,
                    )
                except Exception as fallback_error:
                    logger.warning(
                        "Fallback %s/%s failed: %s",
                        fallback.provider, fallback.model, fallback_error,
                    )
                    last_error = fallback_error
            raise last_error

    def _generate_raw(
        self,
        prompt: str,
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_output_tokens: int | None = None,
        json_mode: bool = False,
    ) -> LLMResponse:
        model = model or self.model

        if self.provider == "qwen" and max_output_tokens is not None:
            # ponytail: DashScope caps output at 8192 for qwen-plus/max;
            # clamp instead of erroring the fallback call.
            max_output_tokens = min(max_output_tokens, 8192)

        if self.provider == "gemini":
            config_kwargs = {"temperature": temperature, "candidate_count": 1}
            if max_output_tokens is not None:
                config_kwargs["max_output_tokens"] = max_output_tokens
            if json_mode:
                config_kwargs["response_mime_type"] = "application/json"

            response = self._call_with_retry(lambda: self._client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(**config_kwargs),
            ))
            finish_reason = ""
            if response.candidates:
                finish_reason = str(response.candidates[0].finish_reason or "")
            return LLMResponse(response.text or "", finish_reason)

        # OpenRouter / NVIDIA — both expose an OpenAI-compatible chat.completions API
        completion_kwargs = {}
        if max_output_tokens is not None:
            completion_kwargs["max_tokens"] = max_output_tokens
        if json_mode:
            completion_kwargs["response_format"] = {"type": "json_object"}

        completion = self._call_with_retry(lambda: self._client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            **completion_kwargs,
        ))
        choice = completion.choices[0]
        return LLMResponse(choice.message.content or "", choice.finish_reason or "")

    def generate_json(
        self,
        prompt: str,
        *,
        model: str | None = None,
        temperature: float = 0.5,
        max_output_tokens: int = 4096,
        retries: int = 1,
    ) -> dict:
        """
        Structured JSON call with an explicit token limit, truncation detection,
        and a retry with doubled headroom. Raises ValueError if every attempt
        fails — callers must not silently continue with degraded output.
        """
        last_error: Exception | None = None
        for attempt in range(retries + 1):
            response = self.generate(
                prompt,
                model=model,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                json_mode=True,
            )
            raw = re.sub(r"^```(?:json)?\s*", "", (response.text or "").strip())
            raw = re.sub(r"\s*```$", "", raw).strip()
            try:
                return json.loads(raw)
            except json.JSONDecodeError as e:
                last_error = e
                if response.truncated:
                    logger.warning(
                        "JSON output truncated at %d tokens (finish_reason=%s); retrying with doubled limit.",
                        max_output_tokens, response.finish_reason,
                    )
                    max_output_tokens *= 2
                else:
                    logger.warning("JSON parse failed (attempt %d): %s", attempt + 1, e)
        raise ValueError(
            f"LLM returned unparseable JSON after {retries + 1} attempt(s): {last_error}"
        )

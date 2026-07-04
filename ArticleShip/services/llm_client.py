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
from google import genai
from google.genai import types
from openai import OpenAI

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
}


class LLMResponse:
    def __init__(self, text: str):
        self.text = text


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

    def generate(
        self,
        prompt: str,
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_output_tokens: int | None = None,
        json_mode: bool = False,
    ) -> LLMResponse:
        model = model or self.model

        if self.provider == "gemini":
            config_kwargs = {"temperature": temperature, "candidate_count": 1}
            if max_output_tokens is not None:
                config_kwargs["max_output_tokens"] = max_output_tokens
            if json_mode:
                config_kwargs["response_mime_type"] = "application/json"

            response = self._client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            return LLMResponse(response.text or "")

        # OpenRouter / NVIDIA — both expose an OpenAI-compatible chat.completions API
        completion_kwargs = {}
        if max_output_tokens is not None:
            completion_kwargs["max_tokens"] = max_output_tokens
        if json_mode:
            completion_kwargs["response_format"] = {"type": "json_object"}

        completion = self._client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            **completion_kwargs,
        )
        return LLMResponse(completion.choices[0].message.content or "")

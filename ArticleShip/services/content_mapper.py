import re

_HEADING_RE = re.compile(r"^(#{1,6})\s+\S")
_FENCE_RE = re.compile(r"^\s*```")


def parse_markdown_to_mapping(markdown_text: str) -> list:
    """
    Parses a string of markdown text and maps each heading to its corresponding content.
    Returns a list of dictionaries to preserve the order of the article.

    Format:
    [
        {"heading": "# H1 Title", "level": 1, "content": "The introduction text..."},
        {"heading": "## H2 Title", "level": 2, "content": "The section text..."}
    ]
    """
    lines = markdown_text.split("\n")

    parsed_article = []

    current_heading = "Preamble"
    current_level = 0
    current_content = []
    in_code_fence = False

    for line in lines:
        # Track fenced code blocks so lines like "# comment" inside a code
        # sample (e.g. Python) are never mistaken for a Markdown heading.
        if _FENCE_RE.match(line):
            in_code_fence = not in_code_fence
            current_content.append(line)
            continue

        # Check if the line is a real ATX-style markdown heading (1-6 '#'
        # followed by a space and content), and we're not inside a code block.
        if not in_code_fence and _HEADING_RE.match(line):
            # We found a new heading! Save the previous one if it exists
            if current_content or current_heading != "Preamble":
                parsed_article.append({
                    "heading": current_heading,
                    "level": current_level,
                    "content": "\n".join(current_content).strip()
                })

            # Start tracking the new heading
            current_heading = line.strip()
            # Calculate heading level by counting the '#' characters before the space
            current_level = len(line.split(" ")[0])
            current_content = []
        else:
            # This is content under the current heading
            current_content.append(line)
            
    # Don't forget to push the very last section!
    if current_content or current_heading != "Preamble":
        parsed_article.append({
            "heading": current_heading,
            "level": current_level,
            "content": "\n".join(current_content).strip()
        })
        
    return parsed_article
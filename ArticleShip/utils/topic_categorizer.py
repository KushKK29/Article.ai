"""Topic categorization utility for consistent category detection across services."""


def categorize_topic(topic: str) -> str:
    """
    Categorizes a topic based on keyword detection.
    
    Args:
        topic: The topic/search term to categorize
        
    Returns:
        A category string: "ai", "debug", "seo", "history", "entertainment", 
        "biography", "engineering", or "general"
    """
    topic_lower = topic.lower()
    
    if any(word in topic_lower for word in ["error", "bug", "fix", "issue"]):
        return "debug"
    elif any(word in topic_lower for word in ["ai", "llm", "model", "copilot", "cursor", "gpt", "chatgpt"]):
        return "ai"
    elif any(word in topic_lower for word in ["seo", "adsense", "blog", "ranking", "traffic"]):
        return "seo"
    elif any(word in topic_lower for word in ["history", "war", "ancient", "revolution", "empire"]):
        return "history"
    elif any(word in topic_lower for word in ["movie", "film", "series", "celebrity", "music"]):
        return "entertainment"
    elif any(word in topic_lower for word in ["who is", "biography", "life", "early life"]):
        return "biography"
    elif any(word in topic_lower for word in ["python", "javascript", "typescript", "rust", "golang", "code", "dev", "engineer"]):
        return "engineering"
    else:
        return "general"

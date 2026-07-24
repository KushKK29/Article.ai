from services.privileges import is_admin, is_privileged, over_free_tier_limit, FREE_TIER_ARTICLE_LIMIT

def test_admin_and_support_recognized():
    assert is_admin("kush282930@gmail.com")
    assert is_admin("Kush282930@Gmail.com")  # case-insensitive
    assert not is_admin("someone@example.com")
    assert is_privileged("support@articleship.com")
    assert is_privileged("kush282930@gmail.com")
    assert not is_privileged("someone@example.com")

def test_free_tier_limit():
    free_under = {"email": "u@example.com", "tier": "free", "usage": {"completed_jobs": 4}}
    free_at_limit = {"email": "u@example.com", "tier": "free", "usage": {"completed_jobs": 5}}
    pro_over = {"email": "u@example.com", "tier": "pro", "usage": {"completed_jobs": 999}}
    admin_over = {"email": "kush282930@gmail.com", "tier": "free", "usage": {"completed_jobs": 999}}
    assert not over_free_tier_limit(free_under)
    assert over_free_tier_limit(free_at_limit)
    assert not over_free_tier_limit(pro_over)
    assert not over_free_tier_limit(admin_over)

if __name__ == "__main__":
    test_admin_and_support_recognized()
    test_free_tier_limit()
    print("OK")

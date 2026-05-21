-- product_interest_events.user_id has no index. ProductInterestEventRepository
-- exposes findByUserIdOrderByCreatedAtDesc(userId), used by the GDPR account
-- export. Without an index this is a sequential scan; partial form (excluding
-- the nullable anonymous-visitor rows) keeps the index small.
CREATE INDEX IF NOT EXISTS idx_pie_user_id
    ON product_interest_events (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

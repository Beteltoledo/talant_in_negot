-- Lets any authenticated participant browse rankings for tests in EVERY
-- class, not just their own. The "tests" table itself stays scoped by RLS
-- (tests_select_own_category) because that policy also gates exam-taking
-- access -- a participant must not be able to open or answer another
-- class's exam. But rankings are not sensitive: test_rankings/
-- category_rankings/general_rankings already expose display_name/score
-- for every participant regardless of viewer. The "Por test" selector in
-- RankingsPage queried the raw "tests" table directly, so RLS silently
-- limited it to the viewer's own class -- this view (owned by the
-- migration role, so it bypasses RLS like the ranking views) exposes just
-- enough metadata to populate that selector across every class.

create view public.rankable_tests as
select t.id, t.title, t.category_id, ac.name as category_name, t.difficulty
from public.tests t
join public.age_categories ac on ac.id = t.category_id
where t.is_published;

grant select on public.rankable_tests to authenticated;

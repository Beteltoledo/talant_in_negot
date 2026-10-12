-- Fixes "general_rankings" so it is actually general: migration 0006
-- accidentally partitioned its rank() window by difficulty, so a participant
-- in "medio" (6-7/8-9) never saw participants from "facil" (2-3/4-5) or
-- "dificil" (10-11/18-35/+35) -- the professor reported "en el apartado
-- general no pone a todos". The view keeps the `difficulty` column for
-- display, but ranks across every participant regardless of category or
-- level. category_rankings is left untouched: it is already scoped to one
-- category_id, and difficulty is always a 1:1 function of category_id, so
-- that partition was redundant but not incorrect.

drop view public.general_rankings;
create view public.general_rankings as
select
  a.user_id,
  p.display_name,
  p.category_id,
  c.name as category_name,
  p.difficulty,
  count(*) as attempts_count,
  sum(a.score) as total_score,
  avg(a.score) as average_score,
  rank() over (
    order by sum(a.score) desc, avg(a.score) desc
  ) as rank
from public.test_attempts a
join public.profiles p on p.id = a.user_id
join public.age_categories c on c.id = p.category_id
group by a.user_id, p.display_name, p.category_id, c.name, p.difficulty;

grant select on public.general_rankings to authenticated;

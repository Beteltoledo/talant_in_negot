-- Lets a participant review their own completed attempt: which questions they
-- got right/wrong, their selected options and the correct ones. Previously
-- there was no way to see this after submitting (the professor reported
-- "no puedo ver los fallos"). Security definer, like get_test_questions and
-- submit_attempt, because `questions.correct_options` is otherwise admin-only;
-- it is safe to reveal here because the attempt is already graded and locked.

create or replace function public.get_attempt_review(p_attempt_id uuid)
returns table (
  question_id uuid,
  "position" integer,
  question_type public.question_type,
  prompt text,
  options jsonb,
  correct_options jsonb,
  selected_options jsonb,
  is_correct boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.test_attempts a
    where a.id = p_attempt_id
      and (a.user_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'Attempt not found';
  end if;

  return query
    select q.id, q.position, q.question_type, q.prompt, q.options, q.correct_options,
           aa.selected_options, aa.is_correct
    from public.attempt_answers aa
    join public.questions q on q.id = aa.question_id
    where aa.attempt_id = p_attempt_id
    order by q.position;
end;
$$;

grant execute on function public.get_attempt_review(uuid) to authenticated;

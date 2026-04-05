-- ═══════════════════════════════════════════════════════════════
-- RPC: get decks where current user is an accepted collaborator
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_collaborated_decks()
RETURNS SETOF public.decks
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.*
  FROM public.decks d
  JOIN public.deck_collaborators dc ON dc.deck_id = d.deck_id
  WHERE dc.user_id = auth.uid()
    AND dc.status = 'accepted';
$$;

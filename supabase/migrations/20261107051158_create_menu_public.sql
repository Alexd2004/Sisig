-- DATA-03: the public menu in one round trip.
-- One concern: the public.menu_public function.
--
-- Returns {"categories": [...]}: visible, non-archived categories, each with its
-- non-archived items, each item with its non-archived modifier groups, each group with its
-- non-archived options. Every level is in sort_order (then name, then id), and array order
-- carries the order. Empty levels are [].
--
-- Sold-out items and options stay in the result with is_available false, so clients can
-- show them as sold out. Archived rows and items of hidden or archived categories are left
-- out; their rows are kept.
--
-- Availability windows (available_days, available_from, available_until) are returned and
-- not applied: the menu is chain-wide and has no store time zone here, so the window is
-- checked by clients and by order placement.
--
-- The function runs as the caller (security invoker), so RLS applies. It also filters
-- explicitly, so staff, whose policies show every row, get the same public menu.
--
-- Forward-only: no existing migration is edited.

create or replace function public.menu_public()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object('categories', coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'id', c.id,
               'name', c.name,
               'description', c.description,
               'image_path', c.image_path,
               'translations', c.translations,
               'items', coalesce((
                 select jsonb_agg(
                          jsonb_build_object(
                            'id', i.id,
                            'name', i.name,
                            'description', i.description,
                            'price_cents', i.price_cents,
                            'image_path', i.image_path,
                            'is_available', i.is_available,
                            'is_featured', i.is_featured,
                            'dietary_tags', i.dietary_tags,
                            'allergen_note', i.allergen_note,
                            'available_days', i.available_days,
                            'available_from', i.available_from,
                            'available_until', i.available_until,
                            'translations', i.translations,
                            'modifier_groups', coalesce((
                              select jsonb_agg(
                                       jsonb_build_object(
                                         'id', g.id,
                                         'name', g.name,
                                         'min_select', g.min_select,
                                         'max_select', g.max_select,
                                         'is_required', g.is_required,
                                         'translations', g.translations,
                                         'options', coalesce((
                                           select jsonb_agg(
                                                    jsonb_build_object(
                                                      'id', o.id,
                                                      'name', o.name,
                                                      'price_delta_cents', o.price_delta_cents,
                                                      'is_default', o.is_default,
                                                      'is_available', o.is_available,
                                                      'translations', o.translations
                                                    )
                                                    order by o.sort_order, o.name, o.id
                                                  )
                                             from public.modifier_options o
                                            where o.modifier_group_id = g.id
                                              and o.archived_at is null
                                         ), '[]'::jsonb)
                                       )
                                       order by l.sort_order, g.name, g.id
                                     )
                                from public.menu_item_modifier_groups l
                                join public.modifier_groups g on g.id = l.modifier_group_id
                               where l.menu_item_id = i.id
                                 and g.archived_at is null
                            ), '[]'::jsonb)
                          )
                          order by i.sort_order, i.name, i.id
                        )
                   from public.menu_items i
                  where i.category_id = c.id
                    and i.archived_at is null
               ), '[]'::jsonb)
             )
             order by c.sort_order, c.name, c.id
           )
      from public.menu_categories c
     where c.is_visible
       and c.archived_at is null
  ), '[]'::jsonb))
$$;

comment on function public.menu_public() is
  'Public menu in one call: visible, non-archived categories with non-archived items (sold-out included, with is_available), their non-archived modifier groups and options, in sort order. Availability windows are returned, not applied.';

revoke execute on function public.menu_public() from public;
grant execute on function public.menu_public() to anon, authenticated, service_role;

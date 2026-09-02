-- Synthetic-only seed for local development. No production or personal data.
insert into public.feature_flags (key, enabled, description) values
  ('ai', false, 'Síntese por IA após avaliação e controle de cota.'),
  ('hotmart_live', false, 'Checkout e eventos Hotmart de produção.'),
  ('magic_link', false, 'Link mágico após SMTP e DNS validados.'),
  ('physical_checkout', false, 'Checkout físico fora do escopo atual.')
on conflict (key) do update set enabled = excluded.enabled, description = excluded.description;

insert into public.products (id, slug, name, universe, state, personalized, physical, delivery_modes) values
  ('birth-chart','mapa-astral','Mapa Astral','meu-ceu','PREPARING',true,false,array['web','pdf','svg']),
  ('three-pillars','tres-pilares','Três Pilares','meu-ceu','PREPARING',true,false,array['web']),
  ('solar-return','revolucao-solar','Revolução Solar','ciclos-tempo','PREPARING',true,false,array['web','pdf']),
  ('synastry','sinastria','Sinastria','amor-relacoes','PREPARING',true,false,array['web','pdf']),
  ('tarot-focus','foco-agora','Foco Agora','tarot-arcanos','PREPARING',true,false,array['web']),
  ('purpose-career','mapa-proposito-carreira','Mapa de Propósito & Carreira','proposito-prosperidade','PREPARING',true,false,array['web','pdf','audio']),
  ('direction-journey','jornada-direcao','Jornada de Direção','proposito-prosperidade','PREPARING',true,false,array['web']),
  ('dream-reading','leitura-essencial-sonhos','Leitura Essencial de Sonhos','sonhos-simbolos','PREPARING',true,false,array['web']),
  ('atv-plus','atv-plus','A Tua Vida nos Astros+','global','PREPARING',false,false,array['web','club'])
on conflict (id) do update set name=excluded.name, state='PREPARING', delivery_modes=excluded.delivery_modes;

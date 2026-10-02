-- Phase 1 international airport access anchors and planning estimates.
-- Times are planning estimates, not live timetables.

insert into destination_transport_anchors
(id,destination_id,name,anchor_type,anchor_role,latitude,longitude,priority,active,source,source_id)
values
(32,2,'Kansai International Airport (KIX)','airport','international_entry',34.4320,135.2304,1,true,'official_operator','KIX'),
(33,13,'Chubu Centrair International Airport (NGO)','airport','international_entry',34.8584,136.8054,1,true,'official_operator','NGO'),
(34,34,'Haneda Airport (HND)','airport','international_entry',35.5494,139.7798,1,true,'official_operator','HND'),
(35,34,'Narita International Airport (NRT)','airport','international_entry',35.7720,140.3929,1,true,'official_operator','NRT'),
(36,35,'Fukuoka Airport International Terminal (FUK)','airport','international_entry',33.5859,130.4507,1,true,'official_operator','FUK'),
(37,36,'New Chitose Airport (CTS)','airport','international_entry',42.7752,141.6923,1,true,'official_operator','CTS')
on conflict (id) do update set name=excluded.name,anchor_type=excluded.anchor_type,anchor_role=excluded.anchor_role,latitude=excluded.latitude,longitude=excluded.longitude,active=true,source=excluded.source,source_id=excluded.source_id,updated_at=now();

insert into destination_travel_estimates
(id,from_anchor_id,to_anchor_id,mode,typical_minutes,min_minutes,max_minutes,transfers,source,confidence,active,checked_at)
values
(51,32,1,'limited_express',75,70,90,0,'jr_west_haruka','high',true,now()),
(52,1,32,'limited_express',75,70,90,0,'jr_west_haruka','high',true,now()),
(53,32,2,'limited_express',50,45,60,0,'jr_west_haruka','high',true,now()),
(54,2,32,'limited_express',50,45,60,0,'jr_west_haruka','high',true,now()),
(55,32,3,'rail',65,60,75,0,'jr_west_airport_access','high',true,now()),
(56,3,32,'rail',65,60,75,0,'jr_west_airport_access','high',true,now()),
(57,33,13,'rail',28,28,40,0,'centrair_meitetsu','high',true,now()),
(58,13,33,'rail',28,28,40,0,'centrair_meitetsu','high',true,now()),
(59,34,19,'rail',15,11,25,0,'haneda_keikyu','high',true,now()),
(60,19,34,'rail',15,11,25,0,'haneda_keikyu','high',true,now()),
(61,35,18,'limited_express',53,53,70,0,'jr_east_narita_express','high',true,now()),
(62,18,35,'limited_express',53,53,70,0,'jr_east_narita_express','high',true,now()),
(63,36,20,'mixed',20,15,30,1,'fukuoka_airport_transfer_subway','medium',true,now()),
(64,20,36,'mixed',20,15,30,1,'fukuoka_airport_transfer_subway','medium',true,now()),
(65,37,21,'rail',37,33,43,0,'jr_hokkaido_airport','high',true,now()),
(66,21,37,'rail',37,33,43,0,'jr_hokkaido_airport','high',true,now())
on conflict (id) do update set from_anchor_id=excluded.from_anchor_id,to_anchor_id=excluded.to_anchor_id,mode=excluded.mode,typical_minutes=excluded.typical_minutes,min_minutes=excluded.min_minutes,max_minutes=excluded.max_minutes,transfers=excluded.transfers,source=excluded.source,confidence=excluded.confidence,active=true,checked_at=excluded.checked_at,updated_at=now();
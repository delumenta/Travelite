-- Phase 1 rural public-transport gateways.
-- Gateway anchors are the rail station where normal network travel hands off to local/limited transport.

insert into destination_transport_anchors
(id,destination_id,name,anchor_type,anchor_role,latitude,longitude,priority,active,source,source_id)
values
(38,15,'Nabari Station','rail','rural_gateway',34.62177,136.09582,1,true,'open_data_verified','osm/wikidata'),
(39,15,'Soni Kogen Farm Garden','bus','rural_destination',34.5237641,136.1503025,1,true,'travelite_places','soni-kogen-farm-garden'),
(40,16,'Shimoichiguchi Station','rail','rural_gateway',34.38397,135.78699,1,true,'open_data_verified','wikidata:Q7496967'),
(41,16,'Dorogawa Onsen Bus Stop','bus','rural_destination',34.2662045,135.877318,1,true,'travelite_places','dorogawa-onsen'),
(42,17,'Shimoichiguchi Station','rail','rural_gateway',34.38397,135.78699,1,true,'open_data_verified','wikidata:Q7496967'),
(43,17,'Tenkawa Kawai','bus','rural_destination',34.2355179,135.8750122,1,true,'travelite_places','mitarai-valley-area'),
(44,10,'Hiyoshi Station','rail','rural_gateway',35.16233,135.50345,1,true,'open_data_verified','wikidata:Q871551'),
(45,10,'Miyama Kayabuki-no-Sato','bus','rural_destination',35.314286,135.622617,1,true,'travelite_places','miyama-kayabuki-no-sato'),
(46,12,'Ine','bus','rural_destination',35.6751344,135.2727378,1,true,'travelite_places','ine'),
(47,23,'Kii-Tanabe Station','rail','rural_gateway',33.73305,135.38415,1,true,'open_data_verified','wikidata:Q2888653'),
(48,22,'Kii-Tanabe Station','rail','rural_gateway_west',33.73305,135.38415,1,true,'open_data_verified','wikidata:Q2888653'),
(49,22,'Shingu Station','rail','rural_gateway_east',33.7241,135.9941,1,true,'curated','existing_station_coordinates')
on conflict (id) do update set
name=excluded.name,anchor_type=excluded.anchor_type,anchor_role=excluded.anchor_role,
latitude=excluded.latitude,longitude=excluded.longitude,active=true,source=excluded.source,
source_id=excluded.source_id,updated_at=now();

insert into destination_travel_estimates
(id,from_anchor_id,to_anchor_id,mode,typical_minutes,min_minutes,max_minutes,transfers,source,confidence,active,checked_at)
values
(67,38,39,'limited_bus',44,44,50,0,'mie_kotsu_2026','high',true,now()),
(68,39,38,'limited_bus',44,44,50,0,'mie_kotsu_2026','high',true,now()),
(69,40,41,'limited_bus',78,61,80,0,'nara_kotsu_2026','high',true,now()),
(70,41,40,'limited_bus',75,71,80,0,'nara_kotsu_2026','high',true,now()),
(71,42,43,'limited_bus',54,42,60,0,'nara_kotsu_2026','high',true,now()),
(72,43,42,'limited_bus',57,55,65,0,'nara_kotsu_2026','high',true,now()),
(73,44,45,'local_bus',45,40,55,0,'another_kyoto_official','high',true,now()),
(74,45,44,'local_bus',45,40,55,0,'another_kyoto_official','high',true,now()),
(75,12,46,'local_bus',60,55,70,0,'amanohashidate_tourism','high',true,now()),
(76,46,12,'local_bus',60,55,70,0,'amanohashidate_tourism','high',true,now())
on conflict (id) do update set
from_anchor_id=excluded.from_anchor_id,to_anchor_id=excluded.to_anchor_id,mode=excluded.mode,
typical_minutes=excluded.typical_minutes,min_minutes=excluded.min_minutes,max_minutes=excluded.max_minutes,
transfers=excluded.transfers,source=excluded.source,confidence=excluded.confidence,active=true,
checked_at=excluded.checked_at,updated_at=now();
import subprocess, uuid, concurrent.futures, json
container='supabase_db_softwallet_admin_test'
def sql(q):
 return subprocess.run(['docker','exec',container,'psql','-U','postgres','-d','postgres','-X','-A','-t','-v','ON_ERROR_STOP=1','-c',q],text=True,capture_output=True)
u,p,v,item,a,z=[str(uuid.uuid4()) for _ in range(6)]
seed=f"""INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('{u}','race-{u}@test.local','{{}}');
INSERT INTO public.products(id,name,slug,is_published) VALUES('{p}','Race device','race-{p}',true);
INSERT INTO public.product_variants(id,product_id,sku,price,is_serialized) VALUES('{v}','{p}','race-{v}',10000,true);
INSERT INTO public.inventory_items(id,variant_id,serial_number) VALUES('{item}','{v}','race-{item}');
INSERT INTO public.addresses(id,user_id,recipient_name,phone,line1,city,state) VALUES('{a}','{u}','Race','08011111111','Test street','Ikeja','Lagos');
INSERT INTO public.delivery_zones(id,name,state,fee) VALUES('{z}','Race zone','Lagos',1000);"""
r=sql(seed);assert r.returncode==0,r.stderr
lines=json.dumps([{'variantId':v,'quantity':1,'expectedPrice':10000}])
online=f"BEGIN; SELECT public.begin_customer_checkout('{u}','{uuid.uuid4()}','{lines}','{a}','{z}',''); SELECT pg_sleep(0.5); COMMIT;"
physical=f"BEGIN; SELECT public.admin_record_physical_sale('{item}',null,1,'{u}','race test'); SELECT pg_sleep(0.5); COMMIT;"
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(sql,[online,physical]))
assert sum(r.returncode==0 for r in results)==1,[(r.returncode,r.stderr) for r in results]
print('PASS: checkout versus physical sale — exactly one succeeds')
# A quantity checkout supplies a distinct order for simultaneous webhook fulfillment.
v2=str(uuid.uuid4());r=sql(f"INSERT INTO public.product_variants(id,product_id,sku,price,is_serialized,quantity) VALUES('{v2}','{p}','race-{v2}',1000,false,3)");assert r.returncode==0,r.stderr
lines=json.dumps([{'variantId':v2,'quantity':1,'expectedPrice':1000}])
r=sql(f"SELECT public.begin_customer_checkout('{u}','{uuid.uuid4()}','{lines}','{a}','{z}','')");assert r.returncode==0,r.stderr
o=r.stdout.strip()
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(sql,[f"BEGIN;SELECT * FROM public.fulfill_payment('sw-{o}',2000);SELECT pg_sleep(0.5);COMMIT;"]*2))
assert all(r.returncode==0 for r in results),[r.stderr for r in results]
r=sql(f"SELECT quantity FROM public.product_variants WHERE id='{v2}';SELECT count(*) FROM public.inventory_movements WHERE variant_id='{v2}' AND reason='checkout_fulfillment'")
assert r.stdout.strip().splitlines()==['2','1'],r.stdout
print('PASS: simultaneous duplicate payments — stock decremented once, one fulfillment movement')

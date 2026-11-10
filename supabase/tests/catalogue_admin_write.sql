begin;
select plan(6);

select lives_ok($$
  select public.admin_create_published_product(
    'Admin Test Phone','admin-test-phone','Test description','new',
    null,null,'ADMIN-TEST-PHONE',62000000,true,false,null
  )
$$,'admin creates product and variant atomically');
select is((select count(*)::int from public.products where slug='admin-test-phone'),1,'product was created');
select is((select price from public.product_variants where sku='ADMIN-TEST-PHONE'),62000000,'price is stored in kobo');

set local role anon;
select is((select count(*)::int from public.products where slug='admin-test-phone'),0,'draft hidden from storefront');
reset role;

select lives_ok($$
  select public.admin_update_published_product(
    (select id from public.products where slug='admin-test-phone'),
    (select id from public.product_variants where sku='ADMIN-TEST-PHONE'),
    'Admin Test Phone Updated','New description',60000000,true,null
  )
$$,'staff can publish and update price together');
set local role anon;
select is((select count(*)::int from public.products where slug='admin-test-phone' and name='Admin Test Phone Updated'),1,'published update is visible to storefront');
reset role;

select * from finish();
rollback;

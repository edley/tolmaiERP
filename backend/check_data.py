from app.supabase_client import supabase
r = supabase.table("payment_proofs").select("*").execute()
print("COUNT:", len(r.data))
for row in r.data:
    print(f'  ID={row["id"][:8]}  tenant_id={row["tenant_id"]}  file={row["file_name"]}  status={row["status"]}')

CREATE TABLE meta_assets (
 company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
 business_id VARCHAR(30) NOT NULL DEFAULT '',
 ad_account_id VARCHAR(30) NOT NULL DEFAULT '',
 instagram_id VARCHAR(30) NOT NULL DEFAULT '',
 instagram_handle VARCHAR(120) NOT NULL DEFAULT '',
 facebook_page_id VARCHAR(30) NOT NULL DEFAULT '',
 facebook_page_status VARCHAR(20) NOT NULL DEFAULT 'unknown'
   CHECK (facebook_page_status IN ('unknown','pending','approved')),
 whatsapp_business_id VARCHAR(30) NOT NULL DEFAULT '',
 whatsapp_phone VARCHAR(25) NOT NULL DEFAULT '',
 notes VARCHAR(500) NOT NULL DEFAULT '',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (business_id = '' OR business_id ~ '^[0-9]{1,30}$'),
 CHECK (ad_account_id = '' OR ad_account_id ~ '^[0-9]{1,30}$'),
 CHECK (instagram_id = '' OR instagram_id ~ '^[0-9]{1,30}$'),
 CHECK (facebook_page_id = '' OR facebook_page_id ~ '^[0-9]{1,30}$'),
 CHECK (whatsapp_business_id = '' OR whatsapp_business_id ~ '^[0-9]{1,30}$')
);

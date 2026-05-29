-- Tolmai ERP - Industry Standard Chart of Accounts & Sample Data
-- Run this AFTER supabase-schema.sql to populate demo data

-- ============================================================
-- 1. CHART OF ACCOUNTS (Industry Best Practice - US GAAP style)
-- ============================================================
TRUNCATE ledger_entries, journal_entry_items, journal_entries, accounts CASCADE;

-- Parent accounts first (is_group = true), then detail accounts
INSERT INTO accounts (name, code, type, is_group, is_cash_account, description) VALUES
-- ASSETS (1000-1999)
('Current Assets', '1000', 'asset', TRUE, FALSE, 'Assets expected to be converted to cash within one year'),
('Cash and Cash Equivalents', '1100', 'asset', TRUE, TRUE, 'Cash on hand and in bank'),
  ('Petty Cash', '1110', 'asset', FALSE, TRUE, 'Cash on hand for small expenses'),
  ('Cash in Bank - Operating', '1120', 'asset', FALSE, TRUE, 'Primary operating checking account'),
  ('Cash in Bank - Payroll', '1130', 'asset', FALSE, TRUE, 'Dedicated payroll account'),
  ('Cash in Bank - Savings', '1140', 'asset', FALSE, TRUE, 'Interest-bearing savings account'),
  ('Cash in Bank - Tax', '1150', 'asset', FALSE, TRUE, 'Tax withholding account'),

('Accounts Receivable', '1200', 'asset', TRUE, FALSE, 'Amounts owed by customers'),
  ('Trade Debtors', '1210', 'asset', FALSE, FALSE, 'Customer invoice receivables'),
  ('Other Receivables', '1220', 'asset', FALSE, FALSE, 'Non-trade receivables'),
  ('Allowance for Doubtful Accounts', '1230', 'asset', FALSE, FALSE, 'Estimated uncollectible receivables (contra-asset)'),

('Inventory', '1300', 'asset', TRUE, FALSE, 'Goods held for sale'),
  ('Raw Materials', '1310', 'asset', FALSE, FALSE, 'Unprocessed materials'),
  ('Work in Progress', '1320', 'asset', FALSE, FALSE, 'Partially completed goods'),
  ('Finished Goods', '1330', 'asset', FALSE, FALSE, 'Completed goods ready for sale'),
  ('Inventory Reserve', '1340', 'asset', FALSE, FALSE, 'Obsolescence/valuation reserve (contra-asset)'),

('Prepaid Expenses', '1400', 'asset', TRUE, FALSE, 'Payments made in advance'),
  ('Prepaid Rent', '1410', 'asset', FALSE, FALSE, 'Rent paid in advance'),
  ('Prepaid Insurance', '1420', 'asset', FALSE, FALSE, 'Insurance premiums paid in advance'),
  ('Prepaid Subscriptions', '1430', 'asset', FALSE, FALSE, 'Software/service subscriptions'),

('Other Current Assets', '1500', 'asset', TRUE, FALSE, 'Miscellaneous short-term assets'),
  ('Short-term Investments', '1510', 'asset', FALSE, FALSE, 'Marketable securities < 1 year'),
  ('Advances to Employees', '1520', 'asset', FALSE, FALSE, 'Travel/expense advances'),
  ('Deposits', '1530', 'asset', FALSE, FALSE, 'Security deposits'),

('Fixed Assets', '1600', 'asset', TRUE, FALSE, 'Long-term tangible assets'),
  ('Land', '1610', 'asset', FALSE, FALSE, 'Land held for operations'),
  ('Buildings', '1620', 'asset', FALSE, FALSE, 'Office/warehouse buildings'),
  ('Leasehold Improvements', '1630', 'asset', FALSE, FALSE, 'Improvements to leased property'),
  ('Computer Equipment', '1640', 'asset', FALSE, FALSE, 'Servers, workstations, laptops'),
  ('Office Furniture & Fixtures', '1650', 'asset', FALSE, FALSE, 'Desks, chairs, cabinets'),
  ('Machinery & Equipment', '1660', 'asset', FALSE, FALSE, 'Production/manufacturing equipment'),
  ('Vehicles', '1670', 'asset', FALSE, FALSE, 'Company vehicles'),
  ('Accum. Depreciation - Buildings', '1628', 'asset', FALSE, FALSE, 'Contra-asset for building depreciation'),
  ('Accum. Depreciation - Computer Eq', '1648', 'asset', FALSE, FALSE, 'Contra-asset for computer depreciation'),
  ('Accum. Depreciation - Furniture', '1658', 'asset', FALSE, FALSE, 'Contra-asset for furniture depreciation'),
  ('Accum. Depreciation - Machinery', '1668', 'asset', FALSE, FALSE, 'Contra-asset for machinery depreciation'),
  ('Accum. Depreciation - Vehicles', '1678', 'asset', FALSE, FALSE, 'Contra-asset for vehicle depreciation'),

('Intangible Assets', '1700', 'asset', TRUE, FALSE, 'Non-physical long-term assets'),
  ('Goodwill', '1710', 'asset', FALSE, FALSE, 'Acquisition premium'),
  ('Patents & Trademarks', '1720', 'asset', FALSE, FALSE, 'Intellectual property'),
  ('Software Development Costs', '1730', 'asset', FALSE, FALSE, 'Capitalized software costs'),
  ('Accum. Amortization', '1780', 'asset', FALSE, FALSE, 'Contra-asset amortization'),

-- LIABILITIES (2000-2999)
('Current Liabilities', '2000', 'liability', TRUE, FALSE, 'Obligations due within one year'),
('Accounts Payable', '2100', 'liability', TRUE, FALSE, 'Amounts owed to suppliers'),
  ('Trade Creditors', '2110', 'liability', FALSE, FALSE, 'Supplier invoices payable'),
  ('Accrued Expenses', '2120', 'liability', FALSE, FALSE, 'Expenses incurred but not yet billed'),

('Payroll Liabilities', '2200', 'liability', TRUE, FALSE, 'Employee-related obligations'),
  ('Salaries Payable', '2210', 'liability', FALSE, FALSE, 'Accrued salaries not yet paid'),
  ('Employee Benefits Payable', '2220', 'liability', FALSE, FALSE, 'Health/retirement contributions payable'),
  ('Payroll Taxes Payable', '2230', 'liability', FALSE, FALSE, 'Withheld payroll taxes'),

('Tax Liabilities', '2300', 'liability', TRUE, FALSE, 'Tax obligations'),
  ('Income Tax Payable', '2310', 'liability', FALSE, FALSE, 'Corporate income tax payable'),
  ('Sales Tax / VAT Payable', '2320', 'liability', FALSE, FALSE, 'Output tax collected'),
  ('Withholding Tax Payable', '2330', 'liability', FALSE, FALSE, 'Tax withheld from payments'),

('Other Current Liabilities', '2400', 'liability', TRUE, FALSE, 'Other short-term obligations'),
  ('Deferred Revenue', '2410', 'liability', FALSE, FALSE, 'Unearned customer prepayments'),
  ('Short-term Loans', '2420', 'liability', FALSE, FALSE, 'Bank loans due < 1 year'),
  ('Current Portion of Long-term Debt', '2430', 'liability', FALSE, FALSE, 'LT debt due within 12 months'),
  ('Dividends Payable', '2440', 'liability', FALSE, FALSE, 'Declared dividends unpaid'),
  ('Interest Payable', '2450', 'liability', FALSE, FALSE, 'Accrued interest on borrowings'),

('Long-term Liabilities', '2500', 'liability', TRUE, FALSE, 'Obligations due beyond one year'),
  ('Long-term Loans', '2510', 'liability', FALSE, FALSE, 'Bank loans > 1 year'),
  ('Notes Payable', '2520', 'liability', FALSE, FALSE, 'Promissory notes > 1 year'),
  ('Lease Obligations', '2530', 'liability', FALSE, FALSE, 'Finance lease liabilities'),
  ('Deferred Tax Liabilities', '2540', 'liability', FALSE, FALSE, 'Future tax obligations'),

-- EQUITY (3000-3999)
('Equity', '3000', 'equity', TRUE, FALSE, 'Shareholders equity'),
  ('Share Capital - Ordinary', '3100', 'equity', FALSE, FALSE, 'Common stock at par value'),
  ('Additional Paid-in Capital', '3200', 'equity', FALSE, FALSE, 'Share premium above par'),
  ('Retained Earnings', '3300', 'equity', FALSE, FALSE, 'Cumulative retained profits'),
  ('Current Year Earnings', '3400', 'equity', FALSE, FALSE, 'This fiscal year net profit/loss'),
  ('Dividends', '3500', 'equity', FALSE, FALSE, 'Dividends declared (contra-equity)'),
  ('Treasury Shares', '3600', 'equity', FALSE, FALSE, 'Shares repurchased (contra-equity)'),
  ('Other Comprehensive Income', '3700', 'equity', FALSE, FALSE, 'Unrealized gains/losses'),

-- REVENUE (4000-4999)
('Revenue', '4000', 'income', TRUE, FALSE, 'Operating income'),
  ('Product Sales Revenue', '4100', 'income', FALSE, FALSE, 'Revenue from product sales'),
  ('Service Revenue', '4200', 'income', FALSE, FALSE, 'Revenue from services rendered'),
  ('Consulting Revenue', '4300', 'income', FALSE, FALSE, 'Revenue from consulting engagements'),
  ('Subscription Revenue', '4400', 'income', FALSE, FALSE, 'Recurring subscription income'),
  ('License Revenue', '4500', 'income', FALSE, FALSE, 'Software/IP license fees'),
  ('Shipping & Handling Revenue', '4600', 'income', FALSE, FALSE, 'Freight charged to customers'),
  ('Sales Returns & Allowances', '4700', 'income', FALSE, FALSE, 'Customer returns/credits (contra-revenue)'),
  ('Trade Discounts', '4800', 'income', FALSE, FALSE, 'Volume/promotional discounts (contra-revenue)'),

-- OTHER INCOME (4900-4999)
('Other Income', '4900', 'income', TRUE, FALSE, 'Non-operating income'),
  ('Interest Income', '4910', 'income', FALSE, FALSE, 'Bank interest earned'),
  ('Rental Income', '4920', 'income', FALSE, FALSE, 'Property rental income'),
  ('Foreign Exchange Gain', '4930', 'income', FALSE, FALSE, 'FX transaction gains'),
  ('Gain on Sale of Assets', '4940', 'income', FALSE, FALSE, 'Profit from asset disposals'),
  ('Other Miscellaneous Income', '4990', 'income', FALSE, FALSE, 'Sundry income'),

-- COST OF GOODS SOLD (5000-5999)
('Cost of Goods Sold', '5000', 'expense', TRUE, FALSE, 'Direct costs attributable to revenue'),
  ('Raw Material Purchases', '5100', 'expense', FALSE, FALSE, 'Cost of raw materials'),
  ('Direct Labor', '5200', 'expense', FALSE, FALSE, 'Production staff wages'),
  ('Manufacturing Overhead', '5300', 'expense', FALSE, FALSE, 'Factory indirect costs'),
  ('Freight & Shipping Costs', '5400', 'expense', FALSE, FALSE, 'Outbound freight expense'),
  ('Inventory Adjustments', '5500', 'expense', FALSE, FALSE, 'Write-offs/cycle count adjustments'),
  ('Purchase Discounts', '5600', 'expense', FALSE, FALSE, 'Prompt payment discounts received (contra-expense)'),

-- OPERATING EXPENSES (6000-6999)
('Operating Expenses', '6000', 'expense', TRUE, FALSE, 'General and administrative expenses'),

('Salaries & Wages', '6100', 'expense', TRUE, FALSE, 'Employee compensation'),
  ('Management Salaries', '6110', 'expense', FALSE, FALSE, 'Executive and management compensation'),
  ('Administrative Salaries', '6120', 'expense', FALSE, FALSE, 'Admin staff salaries'),
  ('Sales Commissions', '6130', 'expense', FALSE, FALSE, 'Sales team commissions'),
  ('Bonuses & Incentives', '6140', 'expense', FALSE, FALSE, 'Performance bonuses'),
  ('Contract Labor', '6150', 'expense', FALSE, FALSE, 'Freelancers and contractors'),

('Employee Benefits', '6200', 'expense', TRUE, FALSE, 'Non-wage employee costs'),
  ('Health Insurance', '6210', 'expense', FALSE, FALSE, 'Medical/dental/vision insurance'),
  ('Retirement Plan Contributions', '6220', 'expense', FALSE, FALSE, '401k/pension matching'),
  ('Payroll Taxes', '6230', 'expense', FALSE, FALSE, 'Employer social security/medicare'),
  ('Training & Development', '6240', 'expense', FALSE, FALSE, 'Employee education and training'),
  ('Recruitment & Staffing', '6250', 'expense', FALSE, FALSE, 'Hiring and agency fees'),

('Office & Administrative', '6300', 'expense', TRUE, FALSE, 'General office costs'),
  ('Office Rent', '6310', 'expense', FALSE, FALSE, 'Office space lease payments'),
  ('Office Supplies', '6320', 'expense', FALSE, FALSE, 'Stationery and consumables'),
  ('Utilities', '6330', 'expense', FALSE, FALSE, 'Electricity, water, internet, phone'),
  ('Postage & Courier', '6340', 'expense', FALSE, FALSE, 'Shipping and mailing costs'),
  ('Printing & Reproduction', '6350', 'expense', FALSE, FALSE, 'Documents and marketing collateral'),

('Technology & IT', '6400', 'expense', TRUE, FALSE, 'Information technology costs'),
  ('Software Subscriptions', '6410', 'expense', FALSE, FALSE, 'SaaS and license fees'),
  ('Hardware Maintenance', '6420', 'expense', FALSE, FALSE, 'Computer repairs and support'),
  ('Cloud Services', '6430', 'expense', FALSE, FALSE, 'AWS/Azure/GCP hosting'),
  ('Internet & Telecom', '6440', 'expense', FALSE, FALSE, 'ISP and phone bills'),

('Professional Services', '6500', 'expense', TRUE, FALSE, 'External professional fees'),
  ('Legal Fees', '6510', 'expense', FALSE, FALSE, 'Attorney and legal costs'),
  ('Accounting & Audit', '6520', 'expense', FALSE, FALSE, 'CPA and auditor fees'),
  ('Consulting Fees', '6530', 'expense', FALSE, FALSE, 'Management/strategy consulting'),
  ('Bank Charges', '6540', 'expense', FALSE, FALSE, 'Bank service fees and merchant fees'),

('Marketing & Advertising', '6600', 'expense', TRUE, FALSE, 'Sales and marketing costs'),
  ('Digital Advertising', '6610', 'expense', FALSE, FALSE, 'Google Ads, Meta, LinkedIn ads'),
  ('Print Advertising', '6620', 'expense', FALSE, FALSE, 'Newspaper/magazine ads'),
  ('Events & Trade Shows', '6630', 'expense', FALSE, FALSE, 'Conference and exhibition fees'),
  ('Content Creation', '6640', 'expense', FALSE, FALSE, 'Copywriting, design, video production'),
  ('Public Relations', '6650', 'expense', FALSE, FALSE, 'PR agency and media outreach'),

('Travel & Entertainment', '6700', 'expense', TRUE, FALSE, 'Business travel costs'),
  ('Air Travel', '6710', 'expense', FALSE, FALSE, 'Flight tickets'),
  ('Hotel & Accommodation', '6720', 'expense', FALSE, FALSE, 'Hotel stays'),
  ('Meals & Entertainment', '6730', 'expense', FALSE, FALSE, 'Client and team meals'),
  ('Transportation', '6740', 'expense', FALSE, FALSE, 'Taxis, ride-sharing, car rental'),
  ('Mileage Reimbursement', '6750', 'expense', FALSE, FALSE, 'Personal vehicle mileage'),

('Depreciation & Amortization', '6800', 'expense', TRUE, FALSE, 'Non-cash asset expense'),
  ('Depreciation - Buildings', '6810', 'expense', FALSE, FALSE, 'Building depreciation'),
  ('Depreciation - Equipment', '6820', 'expense', FALSE, FALSE, 'Computer and machinery depreciation'),
  ('Depreciation - Furniture', '6830', 'expense', FALSE, FALSE, 'Office furniture depreciation'),
  ('Depreciation - Vehicles', '6840', 'expense', FALSE, FALSE, 'Vehicle depreciation'),
  ('Amortization', '6850', 'expense', FALSE, FALSE, 'Intangible asset amortization'),

('Other Operating Expenses', '6900', 'expense', TRUE, FALSE, 'Miscellaneous expenses'),
  ('Insurance', '6910', 'expense', FALSE, FALSE, 'General liability and property insurance'),
  ('Taxes & Licenses', '6920', 'expense', FALSE, FALSE, 'Business licenses and permits'),
  ('Dues & Subscriptions', '6930', 'expense', FALSE, FALSE, 'Professional memberships'),
  ('Charitable Contributions', '6940', 'expense', FALSE, FALSE, 'Donations and sponsorships'),
  ('Loss on Disposal of Assets', '6950', 'expense', FALSE, FALSE, 'Loss from asset sales'),
  ('Miscellaneous Expenses', '6990', 'expense', FALSE, FALSE, 'Sundry operating expenses'),

-- OTHER EXPENSES (7000-7999)
('Non-Operating Expenses', '7000', 'expense', TRUE, FALSE, 'Non-operating costs'),
  ('Interest Expense', '7100', 'expense', FALSE, FALSE, 'Interest on loans and borrowings'),
  ('Foreign Exchange Loss', '7200', 'expense', FALSE, FALSE, 'FX transaction losses'),
  ('Income Tax Expense', '7300', 'expense', FALSE, FALSE, 'Corporate income tax provision');

-- ============================================================
-- 2. SAMPLE JOURNAL ENTRIES (for demonstration)
-- ============================================================

DO $$
DECLARE
  v_cash_op   UUID;  v_cash_pay  UUID;  v_cash_sav  UUID;
  v_ar        UUID;  v_inv_fg    UUID;
  v_ap        UUID;  v_sal_pay   UUID;  v_tax_pay   UUID;
  v_defer_rev UUID;  v_loan_st   UUID;  v_loan_lt   UUID;
  v_share_cap UUID;  v_ret_earn  UUID;
  v_prod_rev  UUID;  v_serv_rev  UUID;  v_consult_r UUID;
  v_int_inc   UUID;
  v_raw_mat   UUID;  v_direct_l  UUID;  v_mfg_oh    UUID;
  v_sal_mgmt  UUID;  v_sal_adm   UUID;  v_sal_comm  UUID;
  v_health_in UUID;  v_payroll_t UUID;
  v_office_r  UUID;  v_office_s  UUID;  v_util      UUID;
  v_soft_sub  UUID;  v_cloud     UUID;
  v_legal     UUID;  v_acct_aud  UUID;  v_bank_chg  UUID;
  v_digital_a UUID;
  v_air_trvl  UUID;  v_hotel     UUID;  v_meals     UUID;
  v_dep_eq    UUID;
  v_insurance UUID;  v_int_exp   UUID;  v_income_tx UUID;

  v_je_id     UUID;
  v_entry_seq INT := 1000;
  v_today     DATE := CURRENT_DATE;
  v_month     INT := EXTRACT(MONTH FROM v_today);
  v_year      INT := EXTRACT(YEAR FROM v_today);
  v_fy_start  DATE := MAKE_DATE(v_year, 1, 1);
BEGIN

  -- Map account codes to IDs
  SELECT id INTO v_cash_op   FROM accounts WHERE code = '1120';
  SELECT id INTO v_cash_pay  FROM accounts WHERE code = '1130';
  SELECT id INTO v_cash_sav  FROM accounts WHERE code = '1140';
  SELECT id INTO v_ar        FROM accounts WHERE code = '1210';
  SELECT id INTO v_inv_fg    FROM accounts WHERE code = '1330';
  SELECT id INTO v_ap        FROM accounts WHERE code = '2110';
  SELECT id INTO v_sal_pay   FROM accounts WHERE code = '2210';
  SELECT id INTO v_tax_pay   FROM accounts WHERE code = '2310';
  SELECT id INTO v_defer_rev FROM accounts WHERE code = '2410';
  SELECT id INTO v_loan_st   FROM accounts WHERE code = '2420';
  SELECT id INTO v_loan_lt   FROM accounts WHERE code = '2510';
  SELECT id INTO v_share_cap FROM accounts WHERE code = '3100';
  SELECT id INTO v_ret_earn  FROM accounts WHERE code = '3300';
  SELECT id INTO v_prod_rev  FROM accounts WHERE code = '4100';
  SELECT id INTO v_serv_rev  FROM accounts WHERE code = '4200';
  SELECT id INTO v_consult_r FROM accounts WHERE code = '4300';
  SELECT id INTO v_int_inc   FROM accounts WHERE code = '4910';
  SELECT id INTO v_raw_mat   FROM accounts WHERE code = '5100';
  SELECT id INTO v_direct_l  FROM accounts WHERE code = '5200';
  SELECT id INTO v_mfg_oh    FROM accounts WHERE code = '5300';
  SELECT id INTO v_sal_mgmt  FROM accounts WHERE code = '6110';
  SELECT id INTO v_sal_adm   FROM accounts WHERE code = '6120';
  SELECT id INTO v_sal_comm  FROM accounts WHERE code = '6130';
  SELECT id INTO v_health_in FROM accounts WHERE code = '6210';
  SELECT id INTO v_payroll_t FROM accounts WHERE code = '6230';
  SELECT id INTO v_office_r  FROM accounts WHERE code = '6310';
  SELECT id INTO v_office_s  FROM accounts WHERE code = '6320';
  SELECT id INTO v_util      FROM accounts WHERE code = '6330';
  SELECT id INTO v_soft_sub  FROM accounts WHERE code = '6410';
  SELECT id INTO v_cloud     FROM accounts WHERE code = '6430';
  SELECT id INTO v_legal     FROM accounts WHERE code = '6510';
  SELECT id INTO v_acct_aud  FROM accounts WHERE code = '6520';
  SELECT id INTO v_bank_chg  FROM accounts WHERE code = '6540';
  SELECT id INTO v_digital_a FROM accounts WHERE code = '6610';
  SELECT id INTO v_air_trvl  FROM accounts WHERE code = '6710';
  SELECT id INTO v_hotel     FROM accounts WHERE code = '6720';
  SELECT id INTO v_meals     FROM accounts WHERE code = '6730';
  SELECT id INTO v_dep_eq    FROM accounts WHERE code = '6820';
  SELECT id INTO v_insurance FROM accounts WHERE code = '6910';
  SELECT id INTO v_int_exp   FROM accounts WHERE code = '7100';
  SELECT id INTO v_income_tx FROM accounts WHERE code = '7300';

  -- JE-1: Share capital injection (opening balance)
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')), v_fy_start, 'Opening entry - Share capital injection', 500000000, 500000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_cash_op, 500000000, 0, 'Initial share capital deposit'),
    (v_je_id, v_share_cap, 0, 500000000, 'Issuance of ordinary shares');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

  -- JE-2: Long-term loan received
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')), v_fy_start + 5, 'Bank loan - Equipment financing', 300000000, 300000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_cash_op, 300000000, 0, 'Loan proceeds deposited'),
    (v_je_id, v_loan_lt, 0, 300000000, '5-year equipment loan');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

  -- JE-3: Product sales (multiple months)
  FOR m IN 1..v_month LOOP
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 15),
            CONCAT('Product sales - Month ', m, '/', v_year),
            25000000, 25000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_ar, 25000000, 0, CONCAT('Sales invoice - ', m, '/', v_year)),
      (v_je_id, v_prod_rev, 0, 25000000, CONCAT('Product revenue - ', m, '/', v_year));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;

    -- Customer payments received 30 days later
    IF m < v_month THEN
      INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
      VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
              MAKE_DATE(v_year, m + 1, 15),
              CONCAT('Customer payment received - Invoice Month ', m),
              25000000, 25000000, 'submitted')
      RETURNING id INTO v_je_id;
      INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
        (v_je_id, v_cash_op, 25000000, 0, CONCAT('Check deposit - customer payment ', m)),
        (v_je_id, v_ar, 0, 25000000, CONCAT('AR cleared - payment for month ', m));
      INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
      SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
      FROM journal_entry_items WHERE journal_entry_id = v_je_id;
      v_entry_seq := v_entry_seq + 1;
    END IF;
  END LOOP;

  -- JE-4: Service revenue (quarterly retainer)
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
          MAKE_DATE(v_year, 1, 1), 'Annual retainer - Consulting client (Q1)', 60000000, 60000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_cash_op, 60000000, 0, 'Q1 retainer prepayment received'),
    (v_je_id, v_defer_rev, 0, 60000000, 'Deferred revenue - unearned retainer');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

  -- Revenue recognition over Q1
  FOR m IN 1..3 LOOP
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 1),
            CONCAT('Revenue recognition - Retainer month ', m, '/', v_year),
            20000000, 20000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_defer_rev, 20000000, 0, CONCAT('Amortize deferred revenue - month ', m)),
      (v_je_id, v_serv_rev, 0, 20000000, CONCAT('Service revenue recognized - month ', m));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;
  END LOOP;

  -- JE-5: Monthly salary cycle (repeating)
  FOR m IN 1..v_month LOOP
    -- Payroll accrual
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 28), CONCAT('Salary accrual - Month ', m, '/', v_year),
            85000000, 85000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_sal_mgmt, 40000000, 0, 'Management salaries'),
      (v_je_id, v_sal_adm, 25000000, 0, 'Admin staff salaries'),
      (v_je_id, v_sal_comm, 20000000, 0, 'Sales commissions'),
      (v_je_id, v_sal_pay, 0, 85000000, 'Salaries payable');
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;

    -- Payment (next month or same if < current)
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 28), CONCAT('Salary payment - Month ', m, '/', v_year),
            85000000, 85000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_sal_pay, 85000000, 0, 'Salary disbursement'),
      (v_je_id, v_cash_pay, 0, 85000000, 'EFT salaries');
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;
  END LOOP;

  -- JE-6: Monthly overheads (repeating)
  FOR m IN 1..v_month LOOP
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 5), CONCAT('Office rent - Month ', m, '/', v_year),
            15000000, 15000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_office_r, 15000000, 0, CONCAT('Rent - Month ', m)),
      (v_je_id, v_cash_op, 0, 15000000, CONCAT('Rent payment - Month ', m));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;

    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 10), CONCAT('Utilities - Month ', m, '/', v_year),
            3000000, 3000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_util, 3000000, 0, CONCAT('Electricity/internet - Month ', m)),
      (v_je_id, v_cash_op, 0, 3000000, CONCAT('Utility payment - Month ', m));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;
  END LOOP;

  -- JE-7: COGS entries (repeating bi-monthly)
  FOR m IN 1..v_month LOOP
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 3), CONCAT('Raw material purchase - Month ', m, '/', v_year),
            8000000, 8000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_raw_mat, 8000000, 0, CONCAT('Raw materials - Month ', m)),
      (v_je_id, v_ap, 0, 8000000, CONCAT('Supplier invoice - Month ', m));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;

    -- Supplier payment (net 30)
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 3), CONCAT('Supplier payment - Month ', m, '/', v_year),
            8000000, 8000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_ap, 8000000, 0, CONCAT('Payables clearing - Month ', m)),
      (v_je_id, v_cash_op, 0, 8000000, CONCAT('EFT to supplier - Month ', m));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;

    -- Direct labor
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 28), CONCAT('Direct labor - Month ', m, '/', v_year),
            12000000, 12000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_direct_l, 12000000, 0, CONCAT('Production labor - Month ', m)),
      (v_je_id, v_cash_pay, 0, 12000000, CONCAT('Labor payroll - Month ', m));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;
  END LOOP;

  -- JE-8: Marketing campaigns (quarterly)
  FOR q IN 1..4 LOOP
    IF q * 3 <= v_month THEN
      INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
      VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
              MAKE_DATE(v_year, q * 3, 1), CONCAT('Q', q, ' Marketing campaign'),
              15000000, 15000000, 'submitted')
      RETURNING id INTO v_je_id;
      INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
        (v_je_id, v_digital_a, 10000000, 0, CONCAT('Q', q, ' Google/Facebook ads')),
        (v_je_id, v_air_trvl, 3000000, 0, CONCAT('Q', q, ' Sales team travel')),
        (v_je_id, v_meals, 2000000, 0, CONCAT('Q', q, ' Client entertainment')),
        (v_je_id, v_cash_op, 0, 15000000, CONCAT('Q', q, ' Campaign payment'));
      INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
      SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
      FROM journal_entry_items WHERE journal_entry_id = v_je_id;
      v_entry_seq := v_entry_seq + 1;
    END IF;
  END LOOP;

  -- JE-9: Technology costs
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
          MAKE_DATE(v_year, 1, 1), 'Annual software subscriptions',
          24000000, 24000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_soft_sub, 12000000, 0, 'Microsoft 365 / Google Workspace annual'),
    (v_je_id, v_cloud, 12000000, 0, 'Cloud hosting annual commitment'),
    (v_je_id, v_cash_op, 0, 24000000, 'Annual IT vendor payment');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

  -- JE-10: Professional fees
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
          MAKE_DATE(v_year, 6, 30), 'Mid-year accounting & audit',
          18000000, 18000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_acct_aud, 12000000, 0, 'Audit preparation & review'),
    (v_je_id, v_legal, 6000000, 0, 'Contract review'),
    (v_je_id, v_cash_op, 0, 18000000, 'Professional fees payment');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

  -- JE-11: Employee benefits
  FOR m IN 1..v_month LOOP
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 28), CONCAT('Benefits & payroll taxes - Month ', m, '/', v_year),
            11000000, 11000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_health_in, 6000000, 0, CONCAT('Health insurance - Month ', m)),
      (v_je_id, v_payroll_t, 5000000, 0, CONCAT('Employer payroll taxes - Month ', m)),
      (v_je_id, v_cash_op, 0, 11000000, CONCAT('Benefits payment - Month ', m));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;
  END LOOP;

  -- JE-12: Insurance payment (annual)
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
          MAKE_DATE(v_year, 1, 1), 'Annual insurance premium',
          24000000, 24000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_insurance, 24000000, 0, 'General liability & property insurance'),
    (v_je_id, v_cash_op, 0, 24000000, 'Annual insurance premium');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

  -- JE-13: Loan interest & installment
  FOR m IN 1..v_month LOOP
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 1), CONCAT('Loan repayment - Month ', m, '/', v_year),
            8000000, 8000000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_int_exp, 3000000, 0, CONCAT('Interest - Month ', m)),
      (v_je_id, v_loan_lt, 5000000, 0, CONCAT('Principal repayment - Month ', m)),
      (v_je_id, v_cash_op, 0, 8000000, CONCAT('Loan EMI - Month ', m));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;
  END LOOP;

  -- JE-14: Office supplies (quarterly)
  FOR m IN 1..4 LOOP
    IF m * 3 <= v_month THEN
      INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
      VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
              MAKE_DATE(v_year, m * 3, 15), CONCAT('Q', m, ' Office supplies'),
              2000000, 2000000, 'submitted')
      RETURNING id INTO v_je_id;
      INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
        (v_je_id, v_office_s, 2000000, 0, CONCAT('Q', m, ' stationery & supplies')),
        (v_je_id, v_cash_op, 0, 2000000, CONCAT('Q', m, ' supplies payment'));
      INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
      SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
      FROM journal_entry_items WHERE journal_entry_id = v_je_id;
      v_entry_seq := v_entry_seq + 1;
    END IF;
  END LOOP;

  -- JE-15: Bank charges (monthly)
  FOR m IN 1..v_month LOOP
    INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
    VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
            MAKE_DATE(v_year, m, 28), CONCAT('Bank charges - Month ', m, '/', v_year),
            500000, 500000, 'submitted')
    RETURNING id INTO v_je_id;
    INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
      (v_je_id, v_bank_chg, 500000, 0, CONCAT('Bank service fee - Month ', m)),
      (v_je_id, v_cash_op, 0, 500000, CONCAT('Bank fee deduction - Month ', m));
    INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
    SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
    FROM journal_entry_items WHERE journal_entry_id = v_je_id;
    v_entry_seq := v_entry_seq + 1;
  END LOOP;

  -- JE-16: Depreciation (year-end)
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
          v_today, 'Annual depreciation charge',
          36000000, 36000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_dep_eq, 36000000, 0, 'Annual depreciation - Equipment & furniture'),
    (v_je_id, v_cash_op, 0, 36000000, 'Accumulated depreciation adjustment');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

  -- JE-17: Interest income (quarterly bank interest)
  FOR q IN 1..4 LOOP
    IF q * 3 <= v_month THEN
      INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
      VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
              MAKE_DATE(v_year, q * 3, 31), CONCAT('Q', q, ' Bank interest income'),
              1500000, 1500000, 'submitted')
      RETURNING id INTO v_je_id;
      INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
        (v_je_id, v_cash_sav, 1500000, 0, CONCAT('Q', q, ' interest credited')),
        (v_je_id, v_int_inc, 0, 1500000, CONCAT('Q', q, ' interest income'));
      INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
      SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
      FROM journal_entry_items WHERE journal_entry_id = v_je_id;
      v_entry_seq := v_entry_seq + 1;
    END IF;
  END LOOP;

  -- JE-18: Tax provision (year-to-date)
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
          v_today, 'Estimated income tax provision',
          42000000, 42000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_income_tx, 42000000, 0, 'Estimated corporate tax liability'),
    (v_je_id, v_tax_pay, 0, 42000000, 'Income tax payable');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

  -- JE-19: Transfer to savings (one-time)
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
          MAKE_DATE(v_year, 3, 1), 'Transfer to savings account',
          50000000, 50000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_cash_sav, 50000000, 0, 'Transfer from operating to savings'),
    (v_je_id, v_cash_op, 0, 50000000, 'Transfer to savings account');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

  -- JE-20: Withholding tax (quarterly remittance)
  FOR q IN 1..4 LOOP
    IF q * 3 <= v_month THEN
      INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
      VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
              MAKE_DATE(v_year, q * 3, 15), CONCAT('Q', q, ' Tax remittance'),
              3500000, 3500000, 'submitted')
      RETURNING id INTO v_je_id;
      INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
        (v_je_id, v_payroll_t, 3500000, 0, CONCAT('Q', q, ' withholding tax remitted')),
        (v_je_id, v_cash_op, 0, 3500000, CONCAT('Q', q, ' tax payment'));
      INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
      SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
      FROM journal_entry_items WHERE journal_entry_id = v_je_id;
      v_entry_seq := v_entry_seq + 1;
    END IF;
  END LOOP;

  -- JE-21: Consulting revenue (spot engagement)
  INSERT INTO journal_entries (entry_number, posting_date, description, total_debit, total_credit, status)
  VALUES (CONCAT('JE-', v_year, '-', LPAD(v_entry_seq::TEXT, 4, '0')),
          MAKE_DATE(v_year, 5, 15), 'Strategy consulting engagement',
          35000000, 35000000, 'submitted')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_id, v_cash_op, 35000000, 0, 'Consulting fee received'),
    (v_je_id, v_consult_r, 0, 35000000, 'Strategy consulting revenue');
  INSERT INTO ledger_entries (journal_entry_id, account_id, posting_date, debit, credit, balance, description)
  SELECT v_je_id, account_id, (SELECT posting_date FROM journal_entries WHERE id = v_je_id), debit, credit, 0, description
  FROM journal_entry_items WHERE journal_entry_id = v_je_id;
  v_entry_seq := v_entry_seq + 1;

END $$;

-- ============================================================
-- 3. UPDATE LEDGER BALANCES + RETURNS
-- ============================================================

-- Recalculate running balances for GL correctness
DO $$
DECLARE
  r RECORD;
  v_running NUMERIC(16,2) := 0;
  v_is_debit_positive BOOLEAN;
BEGIN
  FOR r IN SELECT le.id, le.debit, le.credit, a.type
           FROM ledger_entries le
           JOIN accounts a ON a.id = le.account_id
           ORDER BY le.posting_date, le.created_at
  LOOP
    v_is_debit_positive := r.type IN ('asset', 'expense');
    IF r.debit > 0 THEN
      v_running := v_running + (CASE WHEN v_is_debit_positive THEN 1 ELSE -1 END) * r.debit;
    END IF;
    IF r.credit > 0 THEN
      v_running := v_running - (CASE WHEN v_is_debit_positive THEN 1 ELSE -1 END) * r.credit;
    END IF;
    UPDATE ledger_entries SET balance = v_running WHERE id = r.id;
  END LOOP;
END $$;

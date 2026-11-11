import { BcDocTopic } from '../types/agent';

export const BC_DOCS_KNOWLEDGE_BASE: BcDocTopic[] = [
  {
    id: 'al-app-json-manifest',
    title: 'AL Extension Manifest (app.json) & Cloud Packaging',
    category: 'bc_architecture',
    summary: 'The app.json file specifies metadata for Microsoft Dynamics 365 Business Central extensions, including unique GUID ID, version numbering, target runtime, cloud compatibility, and object ID ranges (typically 50100..50149 for custom extensions).',
    referenceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-json-files',
    alSyntaxSnippets: [
      {
        label: 'app.json Cloud Extension Template',
        language: 'json',
        code: `{
  "id": "e391b01c-6d12-4f39-8c90-95ad4bc188f1",
  "name": "ECommerceLoyaltyEngine",
  "publisher": "ContosoDynamics",
  "version": "1.0.0.0",
  "brief": "Autonomous BC Extension for Customer Loyalty & REST API",
  "description": "Engineered by Autonomous BC Agent from Functional Requirement Document",
  "privacyStatement": "https://contoso.com/privacy",
  "EULA": "https://contoso.com/eula",
  "help": "https://contoso.com/help",
  "url": "https://contoso.com",
  "logo": "extension_logo.png",
  "dependencies": [],
  "screenshots": [],
  "platform": "1.0.0.0",
  "application": "24.0.0.0",
  "idRanges": [
    {
      "from": 50100,
      "to": 50149
    }
  ],
  "resourceExposurePolicy": {
    "allowDebugging": true,
    "allowDownloadingSource": false,
    "includeSourceInSymbolFile": true
  },
  "runtime": "13.0",
  "target": "Cloud"
}`
      }
    ],
    bestPractices: [
      'Always set "target": "Cloud" for modern SaaS Dynamics 365 Business Central deployments.',
      'Always allocate IDs within customer ID ranges (50000..99999) to avoid colliding with Microsoft base app (1..49999) or ISV ranges.',
      'Explicitly configure resourceExposurePolicy to enable safe debugging while protecting proprietary IP.'
    ],
    commonPitfalls: [
      'Using deprecated "target": "Internal" which fails AppSource validation and cloud compilation.',
      'Specifying runtime versions that are incompatible with the target Business Central wave.'
    ]
  },
  {
    id: 'al-table-extensions',
    title: 'TableExtensions in AL (Extending Base BC Tables)',
    category: 'al_language',
    summary: 'Table extensions in AL allow adding custom fields and triggers to standard Business Central tables (e.g. Customer 18, Sales Header 36, Item 27) without modifying base Microsoft source code.',
    referenceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-table-ext-object',
    alSyntaxSnippets: [
      {
        label: 'Customer Table Extension Example (TableExt 50100)',
        language: 'al',
        code: `tableextension 50100 "ALC Customer Extension" extends Customer
{
    fields
    {
        field(50100; "ALC Loyalty Tier"; Enum "ALC Loyalty Tier")
        {
            Caption = 'Loyalty Tier';
            DataClassification = CustomerContent;
            
            trigger OnValidate()
            begin
                if "ALC Loyalty Tier" = "ALC Loyalty Tier"::VIP then
                    "ALC Discount Percentage" := 15.0;
            end;
        }
        field(50101; "ALC Loyalty Points"; Integer)
        {
            Caption = 'Loyalty Points';
            DataClassification = CustomerContent;
            MinValue = 0;
        }
        field(50102; "ALC Discount Percentage"; Decimal)
        {
            Caption = 'Loyalty Discount %';
            DataClassification = CustomerContent;
            DecimalPlaces = 0 : 2;
            MinValue = 0;
            MaxValue = 100;
        }
        field(50103; "ALC Web App Sync Date"; DateTime)
        {
            Caption = 'Web App Sync Date';
            DataClassification = SystemMetadata;
            Editable = false;
        }
    }
}`
      }
    ],
    bestPractices: [
      'Prefix all custom fields with a unique 3-4 letter prefix (e.g. "ALC ") to prevent schema conflicts during base app upgrades.',
      'Always specify DataClassification (CustomerContent, EndUserIdentifiableInformation, etc.) to comply with GDPR & telemetry rules.',
      'Implement validation triggers on field level to guarantee business integrity regardless of whether data is inserted via UI or API.'
    ],
    commonPitfalls: [
      'Omitting field numbers within defined idRanges.',
      'Attempting to delete or alter base fields from a tableextension (which is prohibited in modern AL).'
    ]
  },
  {
    id: 'al-page-extensions',
    title: 'PageExtensions & Modern UI Placement in AL',
    category: 'al_language',
    summary: 'Page extensions add custom controls, FastTab groups, and action bar actions to existing Business Central pages like Customer Card (Page 21) or Sales Order (Page 42).',
    referenceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-page-ext-object',
    alSyntaxSnippets: [
      {
        label: 'Customer Card Page Extension (PageExt 50100)',
        language: 'al',
        code: `pageextension 50100 "ALC Customer Card Ext" extends "Customer Card"
{
    layout
    {
        // Add after General FastTab
        addlast(General)
        {
            group("ALC Loyalty Rewards")
            {
                Caption = 'Loyalty & Rewards';

                field("ALC Loyalty Tier"; Rec."ALC Loyalty Tier")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the customer loyalty membership tier.';
                }
                field("ALC Loyalty Points"; Rec."ALC Loyalty Points")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies accumulated points redeemable for discounts.';
                }
                field("ALC Discount Percentage"; Rec."ALC Discount Percentage")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the automatic discount percentage applied to sales lines.';
                }
            }
        }
    }

    actions
    {
        addlast(processing)
        {
            action("ALC RecalculatePoints")
            {
                Caption = 'Recalculate Loyalty Points';
                ToolTip = 'Queries customer sales ledger entries and recalculates points.';
                ApplicationArea = All;
                Image = Recalculate;

                trigger OnAction()
                var
                    LoyaltyMgt: Codeunit "ALC Loyalty Management";
                begin
                    LoyaltyMgt.RecalculateCustomerPoints(Rec."No.");
                    CurrPage.Update(false);
                end;
            }
        }
    }
}`
      }
    ],
    bestPractices: [
      'Always assign ApplicationArea = All to ensure fields are visible to all user roles.',
      'Provide concise ToolTips for all fields and actions to meet Microsoft accessibility standards.',
      'Place custom fields inside logical FastTab groups (e.g. addlast(General)) for clean UX.'
    ],
    commonPitfalls: [
      'Using legacy actionbar syntax instead of modern action categories.',
      'Missing ToolTip attributes, which triggers AL compiler warnings.'
    ]
  },
  {
    id: 'al-api-pages',
    title: 'Modern Business Central API Pages (REST / OData V4)',
    category: 'api_pages',
    summary: 'API pages (PageType = API) in Business Central expose high-performance, standardized REST/OData endpoints consumable by React, Next.js, and external microservices. They support standard CRUD, deep inserts, and batching.',
    referenceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-api-page-object',
    alSyntaxSnippets: [
      {
        label: 'Custom API Page for Customer Loyalty (Page 50102)',
        language: 'al',
        code: `page 50102 "ALC Customer Loyalty API"
{
    PageType = API;
    Caption = 'customerLoyalty';
    APIPublisher = 'alc';
    APIGroup = 'loyalty';
    APIVersion = 'v2.0';
    EntityName = 'customerLoyalty';
    EntitySetName = 'customerLoyalties';
    SourceTable = Customer;
    DelayedInsert = true;
    ODataKeyFields = SystemId;

    layout
    {
        area(content)
        {
            repeater(Group)
            {
                field(id; Rec.SystemId)
                {
                    Caption = 'Id';
                    Editable = false;
                }
                field(number; Rec."No.")
                {
                    Caption = 'Number';
                }
                field(displayName; Rec.Name)
                {
                    Caption = 'DisplayName';
                }
                field(email; Rec."E-Mail")
                {
                    Caption = 'Email';
                }
                field(loyaltyTier; Rec."ALC Loyalty Tier")
                {
                    Caption = 'LoyaltyTier';
                }
                field(loyaltyPoints; Rec."ALC Loyalty Points")
                {
                    Caption = 'LoyaltyPoints';
                }
                field(discountPercentage; Rec."ALC Discount Percentage")
                {
                    Caption = 'DiscountPercentage';
                }
                field(systemCreatedAt; Rec.SystemCreatedAt)
                {
                    Caption = 'SystemCreatedAt';
                    Editable = false;
                }
                field(systemModifiedAt; Rec.SystemModifiedAt)
                {
                    Caption = 'SystemModifiedAt';
                    Editable = false;
                }
            }
        }
    }
}`
      }
    ],
    bestPractices: [
      'Always use camelCase field names in API pages to adhere to standard JSON conventions.',
      'Always set DelayedInsert = true and ODataKeyFields = SystemId for optimal performance.',
      'Specify APIPublisher, APIGroup, and APIVersion to produce clean REST URLs: /api/{publisher}/{group}/{version}/companies({companyId})/{entitySetName}.'
    ],
    commonPitfalls: [
      'Exposing FlowFields without CalcFields, which causes empty data returns or OData exceptions.',
      'Using PascalCase or spaces in EntityName/EntitySetName.'
    ]
  },
  {
    id: 'al-event-subscribers',
    title: 'Event Subscribers & Business Logic Codeunits in AL',
    category: 'event_subscribers',
    summary: 'In modern AL, extensions must never modify base code directly. Instead, business logic is injected using EventSubscribers listening to standard publication events in BC Codeunits and Tables.',
    referenceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-subscribing-to-events',
    alSyntaxSnippets: [
      {
        label: 'Loyalty Management Codeunit with Event Subscribers (Codeunit 50100)',
        language: 'al',
        code: `codeunit 50100 "ALC Loyalty Management"
{
    Access = Public;

    [EventSubscriber(ObjectType::Codeunit, Codeunit::"Sales-Post", 'OnAfterPostSalesDoc', '', true, true)]
    local procedure HandleOnAfterPostSalesDoc(var SalesHeader: Record "Sales Header"; var GenJnlPostLine: Codeunit "Gen. Jnl.-Post Line"; SalesInvHdrNo: Code[20])
    var
        Customer: Record Customer;
        PointsEarned: Integer;
    begin
        if SalesHeader."Document Type" <> SalesHeader."Document Type"::Invoice then
            exit;

        if Customer.Get(SalesHeader."Sell-to Customer No.") then begin
            // Rule: 1 point earned per $10 of sales amount
            PointsEarned := Round(SalesHeader."Amount Including VAT" / 10, 1, '<');
            Customer."ALC Loyalty Points" += PointsEarned;
            
            // Promote tier based on points
            if Customer."ALC Loyalty Points" >= 500 then
                Customer."ALC Loyalty Tier" := Customer."ALC Loyalty Tier"::VIP
            else if Customer."ALC Loyalty Points" >= 200 then
                Customer."ALC Loyalty Tier" := Customer."ALC Loyalty Tier"::Gold;

            Customer.Modify(true);
        end;
    end;

    procedure RecalculateCustomerPoints(CustNo: Code[20])
    var
        Customer: Record Customer;
        CustLedgEntry: Record "Cust. Ledger Entry";
        TotalSales: Decimal;
    begin
        if not Customer.Get(CustNo) then
            exit;

        CustLedgEntry.SetRange("Customer No.", CustNo);
        CustLedgEntry.SetRange("Document Type", CustLedgEntry."Document Type"::Invoice);
        if CustLedgEntry.FindSet() then
            repeat
                CustLedgEntry.CalcFields("Amount (LCY)");
                TotalSales += CustLedgEntry."Amount (LCY)";
            until CustLedgEntry.Next() = 0;

        Customer."ALC Loyalty Points" := Round(TotalSales / 10, 1, '<');
        Customer.Modify(true);
    end;
}`
      }
    ],
    bestPractices: [
      'Isolate all business rules into dedicated Codeunits instead of table triggers.',
      'Always verify event parameters match the publisher signature in the target BC version.',
      'Check if the record exists before modifying to avoid runtime transaction rollbacks.'
    ],
    commonPitfalls: [
      'Hardcoding document types without checking if the sales transaction was actually an invoice.',
      'Modifying records without calling Modify(true) or neglecting to handle rollbacks.'
    ]
  },
  {
    id: 'playwright-bc-selectors',
    title: 'Playwright Automation for Business Central Web Client',
    category: 'playwright_automation',
    summary: 'Automating Microsoft Dynamics 365 Business Central with Playwright requires robust selector strategies due to BC\'s dynamic virtualized DOM, iframe structures, Tell Me launcher (Alt+Q), In-Client Designer mode, and Page Inspector (Ctrl+Alt+F1).',
    referenceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-test-application',
    alSyntaxSnippets: [
      {
        label: 'Playwright Test Script for BC Web Client Customization',
        language: 'typescript',
        code: `import { test, expect } from '@playwright/test';

test.describe('Dynamics 365 Business Central Web Client Customization Suite', () => {
  test('Verify Customer Card Custom Loyalty Fields & Designer Mode', async ({ page }) => {
    // 1. Navigate to Business Central Web Client
    await page.goto(process.env.BC_WEB_URL || 'https://businesscentral.dynamics.com/sandbox');
    
    // 2. Wait for BC Web Client Shell to hydrate
    await page.waitForSelector('.ms-nav-ready, [data-is-focusable="true"]', { timeout: 30000 });
    
    // 3. Open Tell Me Search (Alt+Q)
    await page.keyboard.press('Alt+Q');
    const tellMeInput = page.locator('input[aria-label*="Tell me what you want to do"], input.ms-nav-tellme-search');
    await tellMeInput.waitFor({ state: 'visible' });
    await tellMeInput.fill('Customers');
    await page.keyboard.press('Enter');

    // 4. Wait for Customer List and click first record
    const firstCustomerRow = page.locator('table.ms-nav-grid tbody tr').first();
    await firstCustomerRow.waitFor({ state: 'visible' });
    await firstCustomerRow.click();

    // 5. Trigger Page Inspector (Ctrl+Alt+F1) to verify extension fields
    await page.keyboard.press('Control+Alt+F1');
    const inspectorPane = page.locator('.ms-nav-page-inspector, [aria-label*="Page Inspection"]');
    await expect(inspectorPane).toBeVisible({ timeout: 10000 });

    // 6. Assert Loyalty Fields exist on General FastTab
    const loyaltyTierField = page.locator('[aria-label*="Loyalty Tier"], [data-field-name="ALC Loyalty Tier"]');
    await expect(loyaltyTierField).toBeVisible();

    // 7. Verify Action execution
    const recalcBtn = page.locator('button[aria-label*="Recalculate Loyalty Points"]');
    if (await recalcBtn.isVisible()) {
      await recalcBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});`
      }
    ],
    bestPractices: [
      'Use aria-label and data-field-name attributes rather than generated CSS classes (e.g. .ms-nav-edit-control-1823) which mutate across BC builds.',
      'Handle modal popups and confirmation dialogues using page.on("dialog", dialog => dialog.accept()).',
      'Use keyboard shortcuts (Alt+Q for Tell Me, Ctrl+Alt+F1 for Page Inspector, Alt+F2 for FactBoxes) which are reliable across all localized versions.'
    ],
    commonPitfalls: [
      'Relying on hardcoded timeouts instead of explicit locator waitFor({ state: "visible" }).',
      'Failing to handle FastTab expansion if the tab is initially collapsed.'
    ]
  },
  {
    id: 'nextjs-bc-oauth-integration',
    title: 'React / Next.js Integration via Microsoft Entra ID OAuth & OData V4',
    category: 'api_pages',
    summary: 'Consuming Business Central API Pages from a React or Next.js application requires acquiring a bearer token from Microsoft Entra ID (Azure AD) via the Client Credentials Grant flow, then making authenticated OData V4 REST calls with automatic token caching.',
    referenceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-connect-apps-tips',
    alSyntaxSnippets: [
      {
        label: 'Next.js Route Handler for Business Central REST API (app/api/bc/route.ts)',
        language: 'typescript',
        code: `import { NextRequest, NextResponse } from 'next/server';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getBCAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const tenantId = process.env.AZURE_TENANT_ID!;
  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;

  const tokenUrl = \`https://login.microsoftonline.com/\${tenantId}/oauth2/v2.0/token\`;
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://api.businesscentral.dynamics.com/.default'
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    throw new Error(\`Failed to fetch BC token: \${res.statusText}\`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in * 1000)
  };
  return cachedToken.token;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getBCAccessToken();
    const env = process.env.BC_ENVIRONMENT || 'production';
    const companyId = process.env.BC_COMPANY_ID;
    
    // Custom API Page URL
    const bcEndpoint = \`https://api.businesscentral.dynamics.com/v2.0/\${process.env.AZURE_TENANT_ID}/\${env}/api/alc/loyalty/v2.0/companies(\${companyId})/customerLoyalties\`;

    const response = await fetch(bcEndpoint, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`
      }
    ],
    bestPractices: [
      'Never expose Azure Client Secret to the browser. Always proxy requests through Next.js Server Actions or API Route Handlers.',
      'Cache bearer tokens in server memory based on the expires_in duration to avoid throttling from Microsoft Entra ID.',
      'Always utilize $filter, $select, and $top to minimize payload size over OData v4.'
    ],
    commonPitfalls: [
      'Hardcoding company ID or tenant ID instead of configuring environment variables.',
      'Forgetting the .default scope in the OAuth2 token request.'
    ]
  }
];

export const bcKnowledgeBase = BC_DOCS_KNOWLEDGE_BASE;

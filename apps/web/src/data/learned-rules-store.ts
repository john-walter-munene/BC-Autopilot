import { LearnedRule } from '@bc-agent/shared';

export const INITIAL_LEARNED_RULES: LearnedRule[] = [
  {
    id: 'rule-al0666',
    ruleCode: 'AL0666_DATA_CLASSIFICATION',
    title: 'Mandatory DataClassification on Table & TableExt Fields',
    category: 'al_compiler',
    condition: 'Any field declaration in a Table or TableExtension object in BC 2024 wave 2.',
    remedy: 'Explicitly specify DataClassification = CustomerContent (or EndUserIdentifiableInformation / SystemMetadata).',
    sourceDoc: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/analyzers/al0666',
    learnedAt: '2026-11-09T18:30:00Z',
    timesApplied: 24,
    confidenceScore: 0.99,
    exampleCorrection: {
      before: `field(50100; "Loyalty Tier"; Code[20])
{
    Caption = 'Loyalty Tier';
}`,
      after: `field(50100; "Loyalty Tier"; Code[20])
{
    Caption = 'Loyalty Tier';
    DataClassification = CustomerContent;
}`,
      explanation: 'Omitting DataClassification produces AL0666 compiler warning and violates GDPR privacy compliance audit rules.'
    }
  },
  {
    id: 'rule-aa0207',
    ruleCode: 'AA0207_ACCESSIBILITY_TOOLTIP',
    title: 'Mandatory ToolTip on Page Controls & Action Buttons',
    category: 'al_compiler',
    condition: 'Any field or action control rendered on a Page or PageExtension.',
    remedy: 'Add ToolTip = \'Descriptive action or field purpose\'; attribute.',
    sourceDoc: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/analyzers/aa0207',
    learnedAt: '2026-11-09T19:15:00Z',
    timesApplied: 38,
    confidenceScore: 0.98,
    exampleCorrection: {
      before: `field("Loyalty Points"; Rec."Loyalty Points")
{
    ApplicationArea = All;
}`,
      after: `field("Loyalty Points"; Rec."Loyalty Points")
{
    ApplicationArea = All;
    ToolTip = 'Specifies accumulated points redeemable for discounts.';
}`,
      explanation: 'Accessibility analyzers flag missing ToolTips for end users navigating with screen readers or keyboards.'
    }
  },
  {
    id: 'rule-api-delayed-insert',
    ruleCode: 'API_DELAYED_INSERT_OPTIMIZATION',
    title: 'DelayedInsert & ODataKeyFields on API Pages',
    category: 'api_performance',
    condition: 'Any AL page with PageType = API.',
    remedy: 'Always declare DelayedInsert = true; and ODataKeyFields = SystemId; to enable high-throughput REST and batch deep inserts.',
    sourceDoc: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-api-page-object',
    learnedAt: '2026-11-10T02:10:00Z',
    timesApplied: 19,
    confidenceScore: 0.97,
    exampleCorrection: {
      before: `page 50102 "Customer API"
{
    PageType = API;
    SourceTable = Customer;
}`,
      after: `page 50102 "Customer API"
{
    PageType = API;
    SourceTable = Customer;
    DelayedInsert = true;
    ODataKeyFields = SystemId;
}`,
      explanation: 'Without DelayedInsert, child entities fail validation before headers commit during composite OData requests.'
    }
  },
  {
    id: 'rule-playwright-ready-wait',
    ruleCode: 'PLAYWRIGHT_BC_HYDRATION_SELECTOR',
    title: 'Business Central Web Client Ready Selector Strategy',
    category: 'playwright_dom',
    condition: 'Testing BC Web Client with Playwright after page.goto().',
    remedy: 'Never use hardcoded sleep(5000). Wait for selector .ms-nav-ready, [data-is-focusable="true"], or .ms-nav-action-bar.',
    sourceDoc: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-test-application',
    learnedAt: '2026-11-10T04:45:00Z',
    timesApplied: 15,
    confidenceScore: 0.96,
    exampleCorrection: {
      before: `await page.goto(url);
await page.waitForTimeout(5000); // Flaky!`,
      after: `await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('.ms-nav-ready, .ms-nav-action-bar', { timeout: 30000 });`,
      explanation: 'Business Central renders virtualized DOM nodes inside micro-iframes; waiting for the hydration shell eliminates race conditions.'
    }
  },
  {
    id: 'rule-codeunit-isolation',
    ruleCode: 'EVENT_SUBSCRIBER_ISOLATION',
    title: 'Codeunit Business Logic Isolation via [EventSubscriber]',
    category: 'event_subscribers',
    condition: 'Injecting business rules upon Sales Invoice, Purchase Order, or Customer creation.',
    remedy: 'Create isolated public Codeunits subscribing to standard integration events (e.g. OnAfterPostSalesDoc) with SkipOnMissingLicense = false.',
    sourceDoc: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-subscribing-to-events',
    learnedAt: '2026-11-10T06:00:00Z',
    timesApplied: 21,
    confidenceScore: 0.98,
    exampleCorrection: {
      before: `// Modifying base Sales-Post triggers directly (PROHIBITED in Cloud AL)`,
      after: `[EventSubscriber(ObjectType::Codeunit, Codeunit::"Sales-Post", 'OnAfterPostSalesDoc', '', true, true)]
local procedure OnAfterPostSalesDocSubscriber(...)`,
      explanation: 'Cloud SaaS deployments block direct modifications to Microsoft base app objects.'
    }
  }
];

export interface RealtimeDocFeedItem {
  id: string;
  title: string;
  sourceUrl: string;
  publishedWave: string;
  sampleContent: string;
}

export const REALTIME_DOC_FEEDS: RealtimeDocFeedItem[] = [
  {
    id: 'feed-bc2024-wave2-actionbar',
    title: 'Business Central 2024 Wave 2: Modern Action Bar & Promoted Actions',
    sourceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-promoted-actions',
    publishedWave: '2024 Release Wave 2',
    sampleContent: `Title: Modern Action Bar in AL Language
Summary: In modern Business Central AL, the legacy 'PromotedActionCategories' and 'Promoted = true' properties are officially deprecated. Developers must now define promoted actions within dedicated 'actionbar' groups using 'promoted' syntax:
\`\`\`al
actions
{
    area(Promoted)
    {
        actionref(MyAction_Promoted; MyAction)
        {
        }
    }
}
\`\`\`
Rule: If an extension uses legacy Promoted = true, the AL compiler emits rule AL0604 warning. The agent must convert legacy action syntax to actionref.`
  },
  {
    id: 'feed-api-deep-insert-telemetry',
    title: 'OData V4 REST API: Deep Insert & SystemId Guid Best Practices',
    sourceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-api-page-object#deep-insert',
    publishedWave: '2024 Release Wave 2',
    sampleContent: `Title: OData V4 Deep Inserts in Dynamics 365 Business Central API Pages
Summary: When posting composite documents (such as Sales Invoices with child lines or Customers with Loyalty entries), the API Page must define:
1. 'DelayedInsert = true' on the parent page.
2. 'ODataKeyFields = SystemId' using the universal SystemId GUID rather than table primary key numbers.
3. FlowFields exposed via API must always execute 'Rec.CalcFields()' inside 'OnAfterGetRecord()' trigger, otherwise the JSON response returns null or 0.
Rule: Any API page exposing calculated balances or loyalty points must explicitly implement CalcFields in AL.`
  },
  {
    id: 'feed-playwright-iframe-designer',
    title: 'Automated Browser Testing: Handling BC In-Client Designer & Modal Dialogs',
    sourceUrl: 'https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-designer',
    publishedWave: '2024 Release Wave 2',
    sampleContent: `Title: Automating Dynamics 365 Business Central Designer Mode with Playwright
Summary: When activating In-Client Designer mode via browser automation, BC injects a top-level banner with class '.ms-nav-designer-toolbar'. 
Important selector guidelines:
1. Always register a Playwright dialog listener: 'page.on("dialog", dialog => dialog.accept())' to avoid unhandled modal confirmation prompts when closing cards.
2. For FastTab expansions, use locator: 'button[aria-expanded="false"][aria-label*="FastTabName"]'.click() before asserting child field visibility.
3. Use 'await page.waitForLoadState("domcontentloaded")' after triggering Tell Me search.`
  }
];

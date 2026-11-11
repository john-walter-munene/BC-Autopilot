# 03: AL Extension Code Engineering & Compiler Validation
## Standards, Syntax Rules & CLI Integration for Microsoft AL

---

### 1. AL Cloud Extension Standards (BC 2024 Wave 2)

All AL code synthesized by downstream agents must strictly satisfy Microsoft AppSource and Cloud runtime standards:

| Requirement | Prescribed Value | Compiler Diagnostic |
| :--- | :--- | :--- |
| **Cloud Target** | `"target": "Cloud"` | Direct AppSource deployment constraint |
| **AL Runtime** | `"runtime": "13.0"` | Business Central 2024 wave 2 |
| **Object ID Range** | `50100` to `50149` | Customer extension ID range (50000..99999) |
| **Field DataClassification** | `CustomerContent` | Rule `AL0666` (mandatory privacy tag) |
| **Control Accessibility** | `ToolTip = '...';` | Rule `AA0207` (mandatory screen-reader tag) |
| **API Performance** | `DelayedInsert = true;` | Mandatory for composite OData inserts |
| **API Primary Key** | `ODataKeyFields = SystemId;` | Mandatory for universal GUID routing |

---

### 2. Comprehensive Object Templates

#### 2.1 Extension Manifest (`app.json`)

```json
{
  "id": "b182d83e-7a91-4e4c-b519-75a89f928e12",
  "name": "CustomerLoyaltyExtension",
  "publisher": "ContosoDynamics",
  "version": "1.0.0.0",
  "brief": "Autonomous BC Extension for Customer Loyalty & REST API",
  "description": "Engineered by Autonomous BC Agent from Functional Requirement Document",
  "privacyStatement": "https://contoso.com/privacy",
  "EULA": "https://contoso.com/eula",
  "help": "https://contoso.com/help",
  "url": "https://contoso.com",
  "logo": "extension_icon.png",
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
}
```

#### 2.2 Table Extension (`CustomerExt.TableExt.al`)

```al
tableextension 50100 "ALC Customer Extension" extends Customer
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
            Caption = 'Discount Percentage';
            DataClassification = CustomerContent;
            DecimalPlaces = 0 : 2;
            MinValue = 0;
            MaxValue = 100;
        }
    }
}
```

#### 2.3 Page Extension (`CustomerCardExt.PageExt.al`)

```al
pageextension 50100 "ALC Customer Card Ext" extends "Customer Card"
{
    layout
    {
        addlast(General)
        {
            group("ALC Loyalty Rewards")
            {
                Caption = 'Loyalty & Rewards';

                field("ALC Loyalty Tier"; Rec."ALC Loyalty Tier")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies customer membership tier.';
                }
                field("ALC Loyalty Points"; Rec."ALC Loyalty Points")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies accumulated points balance.';
                }
                field("ALC Discount Percentage"; Rec."ALC Discount Percentage")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies automatic line discount percentage.';
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
                Caption = 'Recalculate Points';
                ToolTip = 'Recalculates customer points from historical posted invoices.';
                ApplicationArea = All;
                Image = Recalculate;

                trigger OnAction()
                var
                    LoyaltyMgt: Codeunit "ALC Extension Management";
                begin
                    LoyaltyMgt.RecalculatePoints(Rec."No.");
                    CurrPage.Update(false);
                end;
            }
        }
    }
}
```

#### 2.4 Modern API Page (`customerLoyaltyAPI.Page.al`)

```al
page 50102 "ALC Customer Loyalty API"
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
                field(systemModifiedAt; Rec.SystemModifiedAt)
                {
                    Caption = 'SystemModifiedAt';
                    Editable = false;
                }
            }
        }
    }
}
```

#### 2.5 Business Logic Codeunit (`ExtensionManagement.Codeunit.al`)

```al
codeunit 50100 "ALC Extension Management"
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
            // Rule: 1 point earned per $10 of invoice amount
            PointsEarned := Round(SalesHeader."Amount Including VAT" / 10, 1, '<');
            Customer."ALC Loyalty Points" += PointsEarned;

            if Customer."ALC Loyalty Points" >= 500 then
                Customer."ALC Loyalty Tier" := Customer."ALC Loyalty Tier"::VIP
            else if Customer."ALC Loyalty Points" >= 200 then
                Customer."ALC Loyalty Tier" := Customer."ALC Loyalty Tier"::Gold;

            Customer.Modify(true);
        end;
    end;

    procedure RecalculatePoints(CustNo: Code[20])
    var
        Customer: Record Customer;
    begin
        if Customer.Get(CustNo) then begin
            Customer.Modify(true);
        end;
    end;
}
```

#### 2.6 PermissionSet (`AppPermissions.PermissionSet.al`)

```al
permissionset 50100 "ALC App Permissions"
{
    Assignable = true;
    Caption = 'Customer Loyalty Permissions';
    Permissions =
        codeunit "ALC Extension Management" = X,
        page "ALC Customer Loyalty API" = X;
}
```

---

### 3. Microsoft AL Compiler CLI (`alc.exe`) Execution

When deploying to a physical or containerized Business Central environment, downstream agents execute:

```bash
# Compile AL Project using Microsoft AL Language Compiler
alc.exe /project:./al-project \
        /packagecachepath:./.alpackages \
        /out:./dist/ContosoDynamics_CustomerLoyaltyExtension_1.0.0.0.app

# Publish .app package to Business Central Sandbox
powershell -Command "Publish-BcContainerApp -containerName bcserver -appFile ./dist/ContosoDynamics_CustomerLoyaltyExtension_1.0.0.0.app -skipVerification -sync"
```

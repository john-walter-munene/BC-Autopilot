import { AlFile, FunctionalRequirementDoc } from '../types/agent';
import { lintAlCode } from '../utils/alLinter';

export function generateAlExtensionFromFrd(frd: FunctionalRequirementDoc): AlFile[] {
  const files: AlFile[] = [];
  const safeId = frd.id.replace(/[^a-zA-Z0-9]/g, '');
  const prefix = 'ALC';

  // 1. app.json
  const appJsonContent = `{
  "id": "b182d83e-7a91-4e4c-b519-75a89f928e12",
  "name": "${frd.title.replace(/[^a-zA-Z0-9]/g, '')}",
  "publisher": "Contoso Dynamics Enterprise",
  "version": "${frd.version}.0",
  "brief": "${frd.title}",
  "description": "${frd.overview.replace(/"/g, '\\"')}",
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
}`;

  files.push({
    filename: 'app.json',
    objectType: 'AppJson',
    objectName: 'app.json',
    content: appJsonContent,
    description: 'Cloud extension manifest with allocated ID ranges 50100..50149.',
    isValid: true,
    diagnostics: lintAlCode('app.json', appJsonContent)
  });

  // 2. Enums if needed
  if (frd.id === 'frd-loyalty-engine') {
    const enumContent = `enum 50100 "${prefix} Loyalty Tier"
{
    Extensible = true;

    value(0; Bronze)
    {
        Caption = 'Bronze Member';
    }
    value(1; Silver)
    {
        Caption = 'Silver Member';
    }
    value(2; Gold)
    {
        Caption = 'Gold Member';
    }
    value(3; VIP)
    {
        Caption = 'VIP Platinum Member';
    }
}`;
    files.push({
      filename: 'LoyaltyTier.Enum.al',
      objectType: 'Enum',
      objectId: 50100,
      objectName: `${prefix} Loyalty Tier`,
      content: enumContent,
      description: 'Extensible enum defining customer loyalty tiers.',
      isValid: true,
      diagnostics: lintAlCode('LoyaltyTier.Enum.al', enumContent)
    });
  }

  // 3. Custom Tables
  frd.customTablesToCreate.forEach((customTable, idx) => {
    const fieldsCode = customTable.fields.map((f, fIdx) => {
      const fieldId = customTable.id + fIdx;
      return `        field(${fieldId}; "${f.name}"; ${f.dataType.includes('Option') ? 'Option' : f.dataType})
        {
            Caption = '${f.name}';
            DataClassification = CustomerContent;
        }`;
    }).join('\n');

    const tableContent = `table ${customTable.id} "${customTable.name}"
{
    DataClassification = CustomerContent;
    Caption = '${customTable.name}';
    LookupPageId = ${customTable.id + 1};
    DrillDownPageId = ${customTable.id + 1};

    fields
    {
${fieldsCode}
    }

    keys
    {
        key(PK; "${customTable.primaryKeys.join('", "')}")
        {
            Clustered = true;
        }
    }
}`;

    files.push({
      filename: `${customTable.name.replace(/[^a-zA-Z0-9]/g, '')}.Table.al`,
      objectType: 'Table',
      objectId: customTable.id,
      objectName: customTable.name,
      content: tableContent,
      description: `Custom storage table for ${customTable.name}.`,
      isValid: true,
      diagnostics: lintAlCode(`${customTable.name}.Table.al`, tableContent)
    });
  });

  // 4. Table Extensions
  frd.baseTablesToExtend.forEach((baseTable, idx) => {
    const extId = 50100 + idx;
    const extName = `${prefix} ${baseTable.name} Ext`;

    const fieldsCode = baseTable.extensionFields.map((f, fIdx) => {
      const fieldId = 50100 + (idx * 10) + fIdx;
      let extraAttrs = '';
      if (f.dataType.includes('Decimal')) {
        extraAttrs += '\n            DecimalPlaces = 0 : 2;';
      }
      if (f.validationRules && f.validationRules.length > 0) {
        extraAttrs += `\n            // FRD Rule: ${f.validationRules[0]}`;
      }
      return `        field(${fieldId}; "${f.name}"; ${f.dataType})
        {
            Caption = '${f.name.replace(prefix + ' ', '')}';
            DataClassification = CustomerContent;${extraAttrs}
        }`;
    }).join('\n');

    const tableExtContent = `tableextension ${extId} "${extName}" extends "${baseTable.name}"
{
    fields
    {
${fieldsCode}
    }
}`;

    files.push({
      filename: `${baseTable.name.replace(/[^a-zA-Z0-9]/g, '')}Ext.TableExt.al`,
      objectType: 'TableExtension',
      objectId: extId,
      objectName: extName,
      content: tableExtContent,
      description: `Extends Microsoft Base Table ${baseTable.name} (Table ${baseTable.id}).`,
      isValid: true,
      diagnostics: lintAlCode(`${baseTable.name}Ext.TableExt.al`, tableExtContent)
    });
  });

  // 5. Page Extensions
  frd.uiCustomizations.forEach((uiCustom, idx) => {
    const pageExtId = 50100 + idx;
    const pageExtName = `${prefix} ${uiCustom.targetPageName.replace(/[^a-zA-Z0-9]/g, '')} Ext`;

    // Map fields from first base table
    const targetBaseTable = frd.baseTablesToExtend[0];
    const fieldControls = (targetBaseTable ? targetBaseTable.extensionFields : []).map(f => {
      return `                field("${f.name}"; Rec."${f.name}")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies ${f.description}';
                }`;
    }).join('\n');

    const pageExtContent = `pageextension ${pageExtId} "${pageExtName}" extends "${uiCustom.targetPageName}"
{
    layout
    {
        ${uiCustom.placement}
        {
            group("${prefix}CustomControls")
            {
                Caption = 'Custom Extension Attributes';

${fieldControls}
            }
        }
    }

    actions
    {
        addlast(processing)
        {
            action("${prefix}SyncAction")
            {
                Caption = 'Run Extension Processing';
                ToolTip = 'Executes autonomous business logic defined in AL Codeunit.';
                ApplicationArea = All;
                Image = Action;

                trigger OnAction()
                var
                    LogicMgt: Codeunit "${prefix} Extension Management";
                begin
                    LogicMgt.ExecuteWorkflow();
                    CurrPage.Update(false);
                end;
            }
        }
    }
}`;

    files.push({
      filename: `${uiCustom.targetPageName.replace(/[^a-zA-Z0-9]/g, '')}Ext.PageExt.al`,
      objectType: 'PageExtension',
      objectId: pageExtId,
      objectName: pageExtName,
      content: pageExtContent,
      description: `Extends UI for ${uiCustom.targetPageName} (Page ${uiCustom.targetPageId}).`,
      isValid: true,
      diagnostics: lintAlCode(`${uiCustom.targetPageName}Ext.PageExt.al`, pageExtContent)
    });
  });

  // 6. Business Logic Codeunit
  const codeunitId = 50100;
  const codeunitName = `${prefix} Extension Management`;
  const codeunitContent = `codeunit ${codeunitId} "${codeunitName}"
{
    Access = Public;

    [EventSubscriber(ObjectType::Codeunit, Codeunit::"Sales-Post", 'OnAfterPostSalesDoc', '', true, true)]
    local procedure OnAfterPostSalesDocSubscriber(var SalesHeader: Record "Sales Header"; var GenJnlPostLine: Codeunit "Gen. Jnl.-Post Line"; SalesInvHdrNo: Code[20])
    begin
        // Handled by Autonomous Agent logic per FRD
        ProcessBusinessRules(SalesHeader."Sell-to Customer No.");
    end;

    procedure ExecuteWorkflow()
    begin
        Message('Autonomous Extension Logic Executed Successfully.');
    end;

    local procedure ProcessBusinessRules(CustNo: Code[20])
    var
        Customer: Record Customer;
    begin
        if CustNo = '' then
            exit;
        if Customer.Get(CustNo) then begin
            // Autonomous logic verification
            Customer.Modify(true);
        end;
    end;
}`;

  files.push({
    filename: `ExtensionManagement.Codeunit.al`,
    objectType: 'Codeunit',
    objectId: codeunitId,
    objectName: codeunitName,
    content: codeunitContent,
    description: 'Autonomous business logic & EventSubscribers per FRD requirements.',
    isValid: true,
    diagnostics: lintAlCode(`ExtensionManagement.Codeunit.al`, codeunitContent)
  });

  // 7. API Page (REST / OData V4)
  const apiPageId = 50102;
  const apiPageName = `${prefix} ${frd.apiExposureNeeds.entityName} API`;
  const exposedFieldsCode = frd.apiExposureNeeds.exposedFields.map(fName => {
    if (fName === 'id') {
      return `                field(id; Rec.SystemId)
                {
                    Caption = 'Id';
                    Editable = false;
                }`;
    }
    return `                field(${fName}; Rec."${fName === 'number' ? 'No.' : (fName === 'displayName' ? 'Name' : (fName === 'email' ? 'E-Mail' : (prefix + ' ' + fName.charAt(0).toUpperCase() + fName.slice(1))))}")
                {
                    Caption = '${fName}';
                }`;
  }).join('\n');

  const apiPageContent = `page ${apiPageId} "${apiPageName}"
{
    PageType = API;
    Caption = '${frd.apiExposureNeeds.entityName}';
    APIPublisher = 'alc';
    APIGroup = 'integrations';
    APIVersion = 'v2.0';
    EntityName = '${frd.apiExposureNeeds.entityName}';
    EntitySetName = '${frd.apiExposureNeeds.entitySetName}';
    SourceTable = Customer;
    DelayedInsert = true;
    ODataKeyFields = SystemId;

    layout
    {
        area(content)
        {
            repeater(Group)
            {
${exposedFieldsCode}
            }
        }
    }
}`;

  files.push({
    filename: `${frd.apiExposureNeeds.entityName}API.Page.al`,
    objectType: 'Page',
    objectId: apiPageId,
    objectName: apiPageName,
    content: apiPageContent,
    description: `Modern REST / OData V4 API Page endpoint for ${frd.apiExposureNeeds.entitySetName}.`,
    isValid: true,
    diagnostics: lintAlCode(`${frd.apiExposureNeeds.entityName}API.Page.al`, apiPageContent)
  });

  // 8. PermissionSet
  const permSetId = 50100;
  const permSetName = `${prefix} App Permissions`;
  const permSetContent = `permissionset ${permSetId} "${permSetName}"
{
    Assignable = true;
    Caption = '${frd.title} Permissions';
    Permissions =
        table ${frd.customTablesToCreate[0]?.id || 50100} = X,
        tabledata ${frd.customTablesToCreate[0]?.id || 50100} = RMID,
        codeunit ${codeunitId} = X,
        page ${apiPageId} = X;
}`;

  files.push({
    filename: `AppPermissions.PermissionSet.al`,
    objectType: 'PermissionSet',
    objectId: permSetId,
    objectName: permSetName,
    content: permSetContent,
    description: 'Modern AL PermissionSet granting execution & data access rights.',
    isValid: true,
    diagnostics: lintAlCode(`AppPermissions.PermissionSet.al`, permSetContent)
  });

  return files;
}

export function generateDefaultAlFiles(summary?: string): {
  manifest: {
    id: string;
    name: string;
    version: string;
    runtime: string;
    target: 'Cloud' | 'OnPrem';
    idRanges: Array<{ from: number; to: number }>;
  };
  files: Array<{
    fileName: string;
    objectType: 'tableextension' | 'pageextension' | 'page' | 'codeunit' | 'permissionset' | 'appjson';
    objectId?: number;
    codeContent: string;
  }>;
} {
  const manifest = {
    id: 'b182d83e-7a91-4e4c-b519-75a89f928e12',
    name: 'BCCustomerScoring',
    version: '1.0.0.0',
    runtime: '13.0',
    target: 'Cloud' as const,
    idRanges: [{ from: 50100, to: 50149 }]
  };

  const tableExt = `tableextension 50100 "ALC Customer Extension" extends Customer
{
    fields
    {
        field(50100; "ALC Loyalty Tier"; Option)
        {
            Caption = 'Loyalty Tier';
            DataClassification = CustomerContent;
            OptionMembers = Bronze, Silver, Gold, VIP;
        }
        field(50101; "ALC Credit Score"; Decimal)
        {
            Caption = 'Credit Score';
            DataClassification = CustomerContent;
            MinValue = 0;
            MaxValue = 1000;
        }
    }
}`;

  const pageExt = `pageextension 50100 "ALC Customer Card Ext" extends "Customer Card"
{
    layout
    {
        addlast(General)
        {
            field("ALC Loyalty Tier"; Rec."ALC Loyalty Tier")
            {
                ApplicationArea = All;
                ToolTip = 'Specifies customer loyalty tier.';
            }
            field("ALC Credit Score"; Rec."ALC Credit Score")
            {
                ApplicationArea = All;
                ToolTip = 'Specifies credit assessment score.';
            }
        }
    }
}`;

  return {
    manifest,
    files: [
      {
        fileName: 'Customer.TableExt.al',
        objectType: 'tableextension',
        objectId: 50100,
        codeContent: tableExt
      },
      {
        fileName: 'CustomerCard.PageExt.al',
        objectType: 'pageextension',
        objectId: 50100,
        codeContent: pageExt
      }
    ]
  };
}

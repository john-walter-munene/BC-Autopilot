import { FunctionalRequirementDoc } from '@bc-agent/shared';

export const SAMPLE_FRDS: FunctionalRequirementDoc[] = [
  {
    id: 'frd-loyalty-engine',
    title: 'E-Commerce Loyalty Points & Tier Automation Engine',
    version: '1.2.0',
    module: 'Sales & Receivables / Customer Management',
    overview: 'This project implements an autonomous loyalty points accumulation and tier classification system in Microsoft Dynamics 365 Business Central. The extension extends Customer (Table 18) and Customer Card (Page 21) with loyalty tiers (Bronze, Silver, Gold, VIP), tracks lifetime points, automatically awards points upon posting Sales Invoices, and exposes a high-performance REST/OData API Page consumed by our React/Next.js customer portal.',
    userStories: [
      'As a Sales Manager, I want each customer to have an automated Loyalty Tier that updates based on total revenue and order frequency.',
      'As an E-Commerce shopper, I want to query my live loyalty points and eligible discount percentage via a React/Next.js Web Portal.',
      'As an ERP Administrator, I want loyalty points to be awarded automatically in real-time when a Sales Invoice is posted in Business Central.',
      'As a Quality Engineer, I want automated Playwright tests to verify the fields exist on the Customer Card and in the BC Web Client Designer.'
    ],
    baseTablesToExtend: [
      {
        id: 18,
        name: 'Customer',
        extensionFields: [
          {
            name: 'ALC Loyalty Tier',
            dataType: 'Enum "ALC Loyalty Tier"',
            description: 'Customer membership status: Bronze, Silver, Gold, VIP.',
            isCustom: true,
            baseTableId: 18,
            baseTableName: 'Customer',
            validationRules: ['VIP tier receives an automatic 15% discount on sales lines.']
          },
          {
            name: 'ALC Loyalty Points',
            dataType: 'Integer',
            description: 'Current redeemable points balance earned from invoice postings.',
            isCustom: true,
            baseTableId: 18,
            baseTableName: 'Customer',
            validationRules: ['Must be non-negative (MinValue = 0).']
          },
          {
            name: 'ALC Discount Percentage',
            dataType: 'Decimal',
            description: 'Automatic discount percentage calculated from current loyalty tier.',
            isCustom: true,
            baseTableId: 18,
            baseTableName: 'Customer',
            validationRules: ['Values between 0.00 and 100.00.']
          },
          {
            name: 'ALC Portal Last Sync',
            dataType: 'DateTime',
            description: 'Timestamp when customer details were last synced to Next.js portal.',
            isCustom: true,
            baseTableId: 18,
            baseTableName: 'Customer'
          }
        ]
      },
      {
        id: 36,
        name: 'Sales Header',
        extensionFields: [
          {
            name: 'ALC Points To Award',
            dataType: 'Integer',
            description: 'Estimated loyalty points to be awarded once this sales document is posted.',
            isCustom: true,
            baseTableId: 36,
            baseTableName: 'Sales Header'
          }
        ]
      }
    ],
    customTablesToCreate: [
      {
        id: 50100,
        name: 'ALC Loyalty Ledger Entry',
        primaryKeys: ['Entry No.'],
        fields: [
          {
            name: 'Entry No.',
            dataType: 'Integer',
            description: 'Auto-incrementing primary key.',
            isCustom: true,
            customTableId: 50100,
            customTableName: 'ALC Loyalty Ledger Entry'
          },
          {
            name: 'Customer No.',
            dataType: 'Code[20]',
            description: 'Reference to Customer."No.".',
            isCustom: true,
            customTableId: 50100,
            customTableName: 'ALC Loyalty Ledger Entry'
          },
          {
            name: 'Posting Date',
            dataType: 'Date',
            description: 'Date the loyalty transaction occurred.',
            isCustom: true,
            customTableId: 50100,
            customTableName: 'ALC Loyalty Ledger Entry'
          },
          {
            name: 'Points Delta',
            dataType: 'Integer',
            description: 'Positive for points earned, negative for redemptions.',
            isCustom: true,
            customTableId: 50100,
            customTableName: 'ALC Loyalty Ledger Entry'
          },
          {
            name: 'Document No.',
            dataType: 'Code[20]',
            description: 'Associated Sales Invoice or Credit Memo number.',
            isCustom: true,
            customTableId: 50100,
            customTableName: 'ALC Loyalty Ledger Entry'
          }
        ]
      }
    ],
    businessRules: [
      {
        id: 'BR-01',
        triggerEvent: 'OnAfterPostSalesDoc in Codeunit "Sales-Post"',
        description: 'When a sales invoice is posted, calculate 1 loyalty point per $10 of total invoice amount and increment Customer."ALC Loyalty Points".',
        targetObject: 'Codeunit "Sales-Post"',
        expectedBehavior: 'Create an ALC Loyalty Ledger Entry and update Customer record.'
      },
      {
        id: 'BR-02',
        triggerEvent: 'OnValidate of "ALC Loyalty Points"',
        description: 'Automatically promote Customer."ALC Loyalty Tier" to Gold when points >= 200, and VIP when points >= 500.',
        targetObject: 'Table 18 Customer',
        expectedBehavior: 'Set tier enum and trigger discount recalculation.'
      }
    ],
    apiExposureNeeds: {
      entityName: 'customerLoyalty',
      entitySetName: 'customerLoyalties',
      exposedFields: ['id', 'number', 'displayName', 'email', 'loyaltyTier', 'loyaltyPoints', 'discountPercentage', 'systemModifiedAt'],
      allowedMethods: ['GET', 'POST', 'PATCH']
    },
    uiCustomizations: [
      {
        targetPageId: 21,
        targetPageName: 'Customer Card',
        placement: 'addlast(General)',
        elementsToAdd: [
          'Group "Loyalty & Rewards" with Loyalty Tier, Loyalty Points, Discount %, and Recalculate Points Action button.'
        ]
      }
    ]
  },
  {
    id: 'frd-hazmat-logistics',
    title: 'Hazardous Materials & Customs Freight Compliance',
    version: '2.0.1',
    module: 'Inventory / Warehouse & Shipping',
    overview: 'Autonomous compliance extension for Business Central to enforce Hazmat classification, UN Identification numbers, flashpoint temperatures, and emergency handling protocols across Item (Table 27) and Sales Line (Table 37). Blocks sales order release if Hazmat documentation is missing, and provides a REST API for 3PL freight brokers.',
    userStories: [
      'As a Compliance Officer, I need items to store UN hazardous class, packaging group, and chemical flash points.',
      'As a Warehouse Manager, shipping documents must print emergency response telephone numbers.',
      'As a Logistics Portal, 3PL partners require real-time REST queries of item hazmat certificates via Next.js.'
    ],
    baseTablesToExtend: [
      {
        id: 27,
        name: 'Item',
        extensionFields: [
          {
            name: 'ALC Is Hazmat',
            dataType: 'Boolean',
            description: 'Indicates whether this item is regulated hazardous material.',
            isCustom: true,
            baseTableId: 27,
            baseTableName: 'Item'
          },
          {
            name: 'ALC UN Number',
            dataType: 'Code[10]',
            description: 'United Nations 4-digit code (e.g. UN1993, UN1203).',
            isCustom: true,
            baseTableId: 27,
            baseTableName: 'Item'
          },
          {
            name: 'ALC Hazmat Class',
            dataType: 'Enum "ALC Hazmat Class"',
            description: 'DOT / IMO hazard classification (Class 3 Flammable, Class 8 Corrosive, etc.).',
            isCustom: true,
            baseTableId: 27,
            baseTableName: 'Item'
          },
          {
            name: 'ALC Flashpoint Celsius',
            dataType: 'Decimal',
            description: 'Minimum temperature at which vapors ignite.',
            isCustom: true,
            baseTableId: 27,
            baseTableName: 'Item'
          }
        ]
      }
    ],
    customTablesToCreate: [
      {
        id: 50105,
        name: 'ALC Hazmat Emergency Sheet',
        primaryKeys: ['UN Number'],
        fields: [
          {
            name: 'UN Number',
            dataType: 'Code[10]',
            description: 'UN Identifier.',
            isCustom: true,
            customTableId: 50105,
            customTableName: 'ALC Hazmat Emergency Sheet'
          },
          {
            name: 'Emergency Response Contact',
            dataType: 'Text[50]',
            description: '24/7 hotline for Chemtrec / First Responders.',
            isCustom: true,
            customTableId: 50105,
            customTableName: 'ALC Hazmat Emergency Sheet'
          },
          {
            name: 'Handling Instructions',
            dataType: 'Text[250]',
            description: 'Immediate containment guidelines in case of spill.',
            isCustom: true,
            customTableId: 50105,
            customTableName: 'ALC Hazmat Emergency Sheet'
          }
        ]
      }
    ],
    businessRules: [
      {
        id: 'HR-01',
        triggerEvent: 'OnBeforeReleaseSalesDoc in Codeunit "Release Sales Document"',
        description: 'Verify that every sales line containing an item marked as Hazmat has a valid UN Number populated before releasing the order.',
        targetObject: 'Codeunit "Release Sales Document"',
        expectedBehavior: 'Throw an error halting document release if hazmat validation fails.'
      }
    ],
    apiExposureNeeds: {
      entityName: 'itemHazmatCompliance',
      entitySetName: 'itemHazmatCompliances',
      exposedFields: ['id', 'itemNo', 'description', 'isHazmat', 'unNumber', 'hazmatClass', 'flashpointCelsius'],
      allowedMethods: ['GET', 'PATCH']
    },
    uiCustomizations: [
      {
        targetPageId: 30,
        targetPageName: 'Item Card',
        placement: 'addlast(Item)',
        elementsToAdd: [
          'FastTab "Hazmat & Logistics Compliance" with UN Number, Hazard Class, Flashpoint, and Chemtrec info.'
        ]
      }
    ]
  },
  {
    id: 'frd-subcontractor-quality',
    title: 'Subcontractor Quality Inspection & Warranty Tracking',
    version: '1.0.0',
    module: 'Purchasing & Manufacturing',
    overview: 'Autonomous quality assurance workflow that intercepts inbound receipt lines, mandates vendor quality certificate registration, calculates pass/fail rates, and exposes inspection endpoints for external Next.js supplier quality portals.',
    userStories: [
      'As a Quality Control Inspector, I need inbound purchase lines for specific items to trigger an inspection hold.',
      'As an Operations VP, I want supplier quality scoring aggregated automatically.',
      'As a Subcontractor, I want to submit lot inspection certificates via a secure Next.js portal.'
    ],
    baseTablesToExtend: [
      {
        id: 120,
        name: 'Purch. Rcpt. Header',
        extensionFields: [
          {
            name: 'ALC Inspection Required',
            dataType: 'Boolean',
            description: 'Flags receipt as requiring QC signoff before invoicing.',
            isCustom: true,
            baseTableId: 120,
            baseTableName: 'Purch. Rcpt. Header'
          },
          {
            name: 'ALC Inspection Status',
            dataType: 'Option (Pending, Passed, Failed, Quarantined)',
            description: 'Status of quality testing.',
            isCustom: true,
            baseTableId: 120,
            baseTableName: 'Purch. Rcpt. Header'
          }
        ]
      }
    ],
    customTablesToCreate: [
      {
        id: 50110,
        name: 'ALC Quality Inspection Sheet',
        primaryKeys: ['Inspection No.'],
        fields: [
          {
            name: 'Inspection No.',
            dataType: 'Code[20]',
            description: 'Sequential ID.',
            isCustom: true,
            customTableId: 50110,
            customTableName: 'ALC Quality Inspection Sheet'
          },
          {
            name: 'Receipt No.',
            dataType: 'Code[20]',
            description: 'Purch. Rcpt. Header reference.',
            isCustom: true,
            customTableId: 50110,
            customTableName: 'ALC Quality Inspection Sheet'
          },
          {
            name: 'Inspector Name',
            dataType: 'Text[80]',
            description: 'Auditor username.',
            isCustom: true,
            customTableId: 50110,
            customTableName: 'ALC Quality Inspection Sheet'
          },
          {
            name: 'Score Percentage',
            dataType: 'Decimal',
            description: 'Audit pass rate (0 - 100%).',
            isCustom: true,
            customTableId: 50110,
            customTableName: 'ALC Quality Inspection Sheet'
          }
        ]
      }
    ],
    businessRules: [
      {
        id: 'QC-01',
        triggerEvent: 'OnAfterPurchRcptHeaderInsert in Codeunit "Purch.-Post"',
        description: 'Automatically flag receipt as Inspection Required if any item belongs to item category "RAW-CHEM".',
        targetObject: 'Codeunit "Purch.-Post"',
        expectedBehavior: 'Initialize QC status to Pending and lock invoice posting.'
      }
    ],
    apiExposureNeeds: {
      entityName: 'qualityInspection',
      entitySetName: 'qualityInspections',
      exposedFields: ['id', 'inspectionNo', 'receiptNo', 'inspectorName', 'scorePercentage', 'status'],
      allowedMethods: ['GET', 'POST', 'PATCH']
    },
    uiCustomizations: [
      {
        targetPageId: 136,
        targetPageName: 'Posted Purchase Receipt',
        placement: 'addlast(General)',
        elementsToAdd: [
          'Group "Quality Assurance" displaying inspection status badge and link to inspection sheet.'
        ]
      }
    ]
  }
];

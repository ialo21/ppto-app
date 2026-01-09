--
-- PostgreSQL database dump
--

\restrict Wl6SgexsmYWbmvpZ2OOvpgPrfGLjVszoEAVmhr22s1ixiwi2hxn49gMGtfe7KFv

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."UserRole" DROP CONSTRAINT IF EXISTS "UserRole_roleId_fkey";
ALTER TABLE IF EXISTS ONLY public."Support" DROP CONSTRAINT IF EXISTS "Support_managementId_fkey";
ALTER TABLE IF EXISTS ONLY public."Support" DROP CONSTRAINT IF EXISTS "Support_expensePackageId_fkey";
ALTER TABLE IF EXISTS ONLY public."Support" DROP CONSTRAINT IF EXISTS "Support_expenseConceptId_fkey";
ALTER TABLE IF EXISTS ONLY public."Support" DROP CONSTRAINT IF EXISTS "Support_costCenterId_fkey";
ALTER TABLE IF EXISTS ONLY public."Support" DROP CONSTRAINT IF EXISTS "Support_areaId_fkey";
ALTER TABLE IF EXISTS ONLY public."SupportCostCenter" DROP CONSTRAINT IF EXISTS "SupportCostCenter_supportId_fkey";
ALTER TABLE IF EXISTS ONLY public."SupportCostCenter" DROP CONSTRAINT IF EXISTS "SupportCostCenter_costCenterId_fkey";
ALTER TABLE IF EXISTS ONLY public."RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_roleId_fkey";
ALTER TABLE IF EXISTS ONLY public."RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_permissionId_fkey";
ALTER TABLE IF EXISTS ONLY public."RecursoTercerizado" DROP CONSTRAINT IF EXISTS "RecursoTercerizado_supportId_fkey";
ALTER TABLE IF EXISTS ONLY public."RecursoTercerizado" DROP CONSTRAINT IF EXISTS "RecursoTercerizado_proveedorId_fkey";
ALTER TABLE IF EXISTS ONLY public."RecursoTercerizado" DROP CONSTRAINT IF EXISTS "RecursoTercerizado_managementId_fkey";
ALTER TABLE IF EXISTS ONLY public."RecursoTercOC" DROP CONSTRAINT IF EXISTS "RecursoTercOC_recursoTercId_fkey";
ALTER TABLE IF EXISTS ONLY public."RecursoTercOC" DROP CONSTRAINT IF EXISTS "RecursoTercOC_ocId_fkey";
ALTER TABLE IF EXISTS ONLY public."PurchaseOrder" DROP CONSTRAINT IF EXISTS "PurchaseOrder_vendorId_fkey";
ALTER TABLE IF EXISTS ONLY public."Provision" DROP CONSTRAINT IF EXISTS "Provision_sustentoId_fkey";
ALTER TABLE IF EXISTS ONLY public."OC" DROP CONSTRAINT IF EXISTS "OC_supportId_fkey";
ALTER TABLE IF EXISTS ONLY public."OC" DROP CONSTRAINT IF EXISTS "OC_proveedorId_fkey";
ALTER TABLE IF EXISTS ONLY public."OC" DROP CONSTRAINT IF EXISTS "OC_cecoId_fkey";
ALTER TABLE IF EXISTS ONLY public."OC" DROP CONSTRAINT IF EXISTS "OC_budgetPeriodToId_fkey";
ALTER TABLE IF EXISTS ONLY public."OC" DROP CONSTRAINT IF EXISTS "OC_budgetPeriodFromId_fkey";
ALTER TABLE IF EXISTS ONLY public."OC" DROP CONSTRAINT IF EXISTS "OC_articuloId_fkey";
ALTER TABLE IF EXISTS ONLY public."OCStatusHistory" DROP CONSTRAINT IF EXISTS "OCStatusHistory_ocId_fkey";
ALTER TABLE IF EXISTS ONLY public."OCDocument" DROP CONSTRAINT IF EXISTS "OCDocument_ocId_fkey";
ALTER TABLE IF EXISTS ONLY public."OCDocument" DROP CONSTRAINT IF EXISTS "OCDocument_documentId_fkey";
ALTER TABLE IF EXISTS ONLY public."OCCostCenter" DROP CONSTRAINT IF EXISTS "OCCostCenter_ocId_fkey";
ALTER TABLE IF EXISTS ONLY public."OCCostCenter" DROP CONSTRAINT IF EXISTS "OCCostCenter_costCenterId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_vendorId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_supportId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_proveedorId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_ocId_fkey";
ALTER TABLE IF EXISTS ONLY public."InvoiceStatusHistory" DROP CONSTRAINT IF EXISTS "InvoiceStatusHistory_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."InvoicePeriod" DROP CONSTRAINT IF EXISTS "InvoicePeriod_periodId_fkey";
ALTER TABLE IF EXISTS ONLY public."InvoicePeriod" DROP CONSTRAINT IF EXISTS "InvoicePeriod_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."InvoiceCostCenter" DROP CONSTRAINT IF EXISTS "InvoiceCostCenter_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."InvoiceCostCenter" DROP CONSTRAINT IF EXISTS "InvoiceCostCenter_costCenterId_fkey";
ALTER TABLE IF EXISTS ONLY public."HistoricoContrato" DROP CONSTRAINT IF EXISTS "HistoricoContrato_recursoTercId_fkey";
ALTER TABLE IF EXISTS ONLY public."ExpenseConcept" DROP CONSTRAINT IF EXISTS "ExpenseConcept_packageId_fkey";
ALTER TABLE IF EXISTS ONLY public."ControlLine" DROP CONSTRAINT IF EXISTS "ControlLine_supportId_fkey";
ALTER TABLE IF EXISTS ONLY public."ControlLine" DROP CONSTRAINT IF EXISTS "ControlLine_poId_fkey";
ALTER TABLE IF EXISTS ONLY public."ControlLine" DROP CONSTRAINT IF EXISTS "ControlLine_periodId_fkey";
ALTER TABLE IF EXISTS ONLY public."ControlLine" DROP CONSTRAINT IF EXISTS "ControlLine_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."ControlLine" DROP CONSTRAINT IF EXISTS "ControlLine_accountingPeriodId_fkey";
ALTER TABLE IF EXISTS ONLY public."BudgetAllocation" DROP CONSTRAINT IF EXISTS "BudgetAllocation_versionId_fkey";
ALTER TABLE IF EXISTS ONLY public."BudgetAllocation" DROP CONSTRAINT IF EXISTS "BudgetAllocation_supportId_fkey";
ALTER TABLE IF EXISTS ONLY public."BudgetAllocation" DROP CONSTRAINT IF EXISTS "BudgetAllocation_periodId_fkey";
ALTER TABLE IF EXISTS ONLY public."BudgetAllocation" DROP CONSTRAINT IF EXISTS "BudgetAllocation_costCenterId_fkey";
ALTER TABLE IF EXISTS ONLY public."Area" DROP CONSTRAINT IF EXISTS "Area_managementId_fkey";
ALTER TABLE IF EXISTS ONLY public."AccountingClosure" DROP CONSTRAINT IF EXISTS "AccountingClosure_periodId_fkey";
DROP INDEX IF EXISTS public.ix_userrole_user;
DROP INDEX IF EXISTS public.ix_userrole_role;
DROP INDEX IF EXISTS public.ix_user_email;
DROP INDEX IF EXISTS public.ix_supportcostcenter_support;
DROP INDEX IF EXISTS public.ix_supportcostcenter_costcenter;
DROP INDEX IF EXISTS public.ix_rolepermission_role;
DROP INDEX IF EXISTS public.ix_rolepermission_permission;
DROP INDEX IF EXISTS public.ix_role_name;
DROP INDEX IF EXISTS public.ix_recurso_terc_oc_recurso;
DROP INDEX IF EXISTS public.ix_recurso_terc_oc_oc;
DROP INDEX IF EXISTS public.ix_recurso_support;
DROP INDEX IF EXISTS public.ix_recurso_status;
DROP INDEX IF EXISTS public.ix_recurso_proveedor;
DROP INDEX IF EXISTS public.ix_recurso_management;
DROP INDEX IF EXISTS public.ix_recurso_fecha_fin;
DROP INDEX IF EXISTS public.ix_provision_sustento;
DROP INDEX IF EXISTS public.ix_provision_periodo_ppto;
DROP INDEX IF EXISTS public.ix_provision_periodo_contable;
DROP INDEX IF EXISTS public.ix_proveedor_ruc;
DROP INDEX IF EXISTS public.ix_proveedor_razon_social;
DROP INDEX IF EXISTS public.ix_permission_parent;
DROP INDEX IF EXISTS public.ix_permission_module;
DROP INDEX IF EXISTS public.ix_permission_key;
DROP INDEX IF EXISTS public.ix_ocstatushistory_oc;
DROP INDEX IF EXISTS public.ix_ocstatushistory_changed_at;
DROP INDEX IF EXISTS public.ix_ocdocument_oc;
DROP INDEX IF EXISTS public.ix_ocdocument_document;
DROP INDEX IF EXISTS public.ix_occostcenter_oc;
DROP INDEX IF EXISTS public.ix_occostcenter_costcenter;
DROP INDEX IF EXISTS public.ix_oc_support;
DROP INDEX IF EXISTS public.ix_oc_proveedor;
DROP INDEX IF EXISTS public.ix_oc_fecha_registro;
DROP INDEX IF EXISTS public.ix_oc_estado;
DROP INDEX IF EXISTS public.ix_invoiceperiod_period;
DROP INDEX IF EXISTS public.ix_invoiceperiod_invoice;
DROP INDEX IF EXISTS public.ix_invoicecostcenter_invoice;
DROP INDEX IF EXISTS public.ix_invoicecostcenter_costcenter;
DROP INDEX IF EXISTS public.ix_invoice_oc;
DROP INDEX IF EXISTS public.ix_historico_recurso;
DROP INDEX IF EXISTS public.ix_historico_periodo;
DROP INDEX IF EXISTS public.ix_document_drive_file;
DROP INDEX IF EXISTS public.ix_document_category;
DROP INDEX IF EXISTS public.ix_cl_type_state;
DROP INDEX IF EXISTS public.ix_cl_support_accounting_period;
DROP INDEX IF EXISTS public.ix_cl_period;
DROP INDEX IF EXISTS public.ix_cl_accounting_period;
DROP INDEX IF EXISTS public.ix_alloc_period_ceco;
DROP INDEX IF EXISTS public.ix_alloc_budget_type;
DROP INDEX IF EXISTS public."Vendor_taxId_key";
DROP INDEX IF EXISTS public."User_googleId_key";
DROP INDEX IF EXISTS public."User_email_key";
DROP INDEX IF EXISTS public."UserRole_userId_roleId_key";
DROP INDEX IF EXISTS public."Support_name_unique_lower";
DROP INDEX IF EXISTS public."Support_code_key";
DROP INDEX IF EXISTS public."SupportCostCenter_supportId_costCenterId_key";
DROP INDEX IF EXISTS public."Role_name_key";
DROP INDEX IF EXISTS public."RolePermission_roleId_permissionId_key";
DROP INDEX IF EXISTS public."RecursoTercOC_recursoTercId_ocId_key";
DROP INDEX IF EXISTS public."PurchaseOrder_number_key";
DROP INDEX IF EXISTS public."Proveedor_ruc_key";
DROP INDEX IF EXISTS public."Permission_key_key";
DROP INDEX IF EXISTS public."OC_numeroOc_key";
DROP INDEX IF EXISTS public."OCDocument_ocId_documentId_key";
DROP INDEX IF EXISTS public."OCCostCenter_ocId_costCenterId_key";
DROP INDEX IF EXISTS public."Management_name_unique_lower";
DROP INDEX IF EXISTS public."InvoicePeriod_invoiceId_periodId_key";
DROP INDEX IF EXISTS public."InvoiceCostCenter_invoiceId_costCenterId_key";
DROP INDEX IF EXISTS public."ExpensePackage_name_unique_lower";
DROP INDEX IF EXISTS public."ExpenseConcept_packageId_name_unique_lower";
DROP INDEX IF EXISTS public."ExchangeRate_year_key";
DROP INDEX IF EXISTS public."Document_driveFileId_key";
DROP INDEX IF EXISTS public."CostCenter_code_unique_lower";
DROP INDEX IF EXISTS public."CostCenter_code_key";
DROP INDEX IF EXISTS public."BudgetAllocation_versionId_periodId_supportId_costCenterId__key";
DROP INDEX IF EXISTS public."Articulo_code_unique_lower";
DROP INDEX IF EXISTS public."Articulo_code_key";
DROP INDEX IF EXISTS public."Area_name_unique_lower";
DROP INDEX IF EXISTS public."ApprovalThreshold_key_key";
DROP INDEX IF EXISTS public."AccountingClosure_periodId_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."Vendor" DROP CONSTRAINT IF EXISTS "Vendor_pkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."UserRole" DROP CONSTRAINT IF EXISTS "UserRole_pkey";
ALTER TABLE IF EXISTS ONLY public."Support" DROP CONSTRAINT IF EXISTS "Support_pkey";
ALTER TABLE IF EXISTS ONLY public."Support" DROP CONSTRAINT IF EXISTS "Support_name_key";
ALTER TABLE IF EXISTS ONLY public."SupportCostCenter" DROP CONSTRAINT IF EXISTS "SupportCostCenter_pkey";
ALTER TABLE IF EXISTS ONLY public."Role" DROP CONSTRAINT IF EXISTS "Role_pkey";
ALTER TABLE IF EXISTS ONLY public."RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_pkey";
ALTER TABLE IF EXISTS ONLY public."RecursoTercerizado" DROP CONSTRAINT IF EXISTS "RecursoTercerizado_pkey";
ALTER TABLE IF EXISTS ONLY public."RecursoTercOC" DROP CONSTRAINT IF EXISTS "RecursoTercOC_pkey";
ALTER TABLE IF EXISTS ONLY public."PurchaseOrder" DROP CONSTRAINT IF EXISTS "PurchaseOrder_pkey";
ALTER TABLE IF EXISTS ONLY public."Provision" DROP CONSTRAINT IF EXISTS "Provision_pkey";
ALTER TABLE IF EXISTS ONLY public."Proveedor" DROP CONSTRAINT IF EXISTS "Proveedor_pkey";
ALTER TABLE IF EXISTS ONLY public."Permission" DROP CONSTRAINT IF EXISTS "Permission_pkey";
ALTER TABLE IF EXISTS ONLY public."Period" DROP CONSTRAINT IF EXISTS "Period_pkey";
ALTER TABLE IF EXISTS ONLY public."OC" DROP CONSTRAINT IF EXISTS "OC_pkey";
ALTER TABLE IF EXISTS ONLY public."OCStatusHistory" DROP CONSTRAINT IF EXISTS "OCStatusHistory_pkey";
ALTER TABLE IF EXISTS ONLY public."OCDocument" DROP CONSTRAINT IF EXISTS "OCDocument_pkey";
ALTER TABLE IF EXISTS ONLY public."OCCostCenter" DROP CONSTRAINT IF EXISTS "OCCostCenter_pkey";
ALTER TABLE IF EXISTS ONLY public."Management" DROP CONSTRAINT IF EXISTS "Management_pkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_pkey";
ALTER TABLE IF EXISTS ONLY public."InvoiceStatusHistory" DROP CONSTRAINT IF EXISTS "InvoiceStatusHistory_pkey";
ALTER TABLE IF EXISTS ONLY public."InvoicePeriod" DROP CONSTRAINT IF EXISTS "InvoicePeriod_pkey";
ALTER TABLE IF EXISTS ONLY public."InvoiceCostCenter" DROP CONSTRAINT IF EXISTS "InvoiceCostCenter_pkey";
ALTER TABLE IF EXISTS ONLY public."HistoricoContrato" DROP CONSTRAINT IF EXISTS "HistoricoContrato_pkey";
ALTER TABLE IF EXISTS ONLY public."FxReference" DROP CONSTRAINT IF EXISTS "FxReference_pkey";
ALTER TABLE IF EXISTS ONLY public."ExpensePackage" DROP CONSTRAINT IF EXISTS "ExpensePackage_pkey";
ALTER TABLE IF EXISTS ONLY public."ExpenseConcept" DROP CONSTRAINT IF EXISTS "ExpenseConcept_pkey";
ALTER TABLE IF EXISTS ONLY public."ExchangeRate" DROP CONSTRAINT IF EXISTS "ExchangeRate_pkey";
ALTER TABLE IF EXISTS ONLY public."Document" DROP CONSTRAINT IF EXISTS "Document_pkey";
ALTER TABLE IF EXISTS ONLY public."CostCenter" DROP CONSTRAINT IF EXISTS "CostCenter_pkey";
ALTER TABLE IF EXISTS ONLY public."ControlLine" DROP CONSTRAINT IF EXISTS "ControlLine_pkey";
ALTER TABLE IF EXISTS ONLY public."BudgetVersion" DROP CONSTRAINT IF EXISTS "BudgetVersion_pkey";
ALTER TABLE IF EXISTS ONLY public."BudgetAllocation" DROP CONSTRAINT IF EXISTS "BudgetAllocation_pkey";
ALTER TABLE IF EXISTS ONLY public."Articulo" DROP CONSTRAINT IF EXISTS "Articulo_pkey";
ALTER TABLE IF EXISTS ONLY public."Area" DROP CONSTRAINT IF EXISTS "Area_pkey";
ALTER TABLE IF EXISTS ONLY public."ApprovalThreshold" DROP CONSTRAINT IF EXISTS "ApprovalThreshold_pkey";
ALTER TABLE IF EXISTS ONLY public."AccountingClosure" DROP CONSTRAINT IF EXISTS "AccountingClosure_pkey";
ALTER TABLE IF EXISTS public."Vendor" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."UserRole" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."User" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."SupportCostCenter" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Support" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."RolePermission" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Role" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."RecursoTercerizado" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."RecursoTercOC" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."PurchaseOrder" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Provision" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Proveedor" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Permission" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Period" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."OCStatusHistory" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."OCDocument" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."OCCostCenter" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."OC" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Management" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."InvoiceStatusHistory" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."InvoicePeriod" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."InvoiceCostCenter" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Invoice" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."HistoricoContrato" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."FxReference" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."ExpensePackage" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."ExpenseConcept" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."ExchangeRate" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Document" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."CostCenter" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."ControlLine" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."BudgetVersion" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."BudgetAllocation" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Articulo" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Area" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."ApprovalThreshold" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."AccountingClosure" ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP SEQUENCE IF EXISTS public."Vendor_id_seq";
DROP TABLE IF EXISTS public."Vendor";
DROP SEQUENCE IF EXISTS public."User_id_seq";
DROP SEQUENCE IF EXISTS public."UserRole_id_seq";
DROP TABLE IF EXISTS public."UserRole";
DROP TABLE IF EXISTS public."User";
DROP SEQUENCE IF EXISTS public."Support_id_seq";
DROP SEQUENCE IF EXISTS public."SupportCostCenter_id_seq";
DROP TABLE IF EXISTS public."SupportCostCenter";
DROP TABLE IF EXISTS public."Support";
DROP SEQUENCE IF EXISTS public."Role_id_seq";
DROP SEQUENCE IF EXISTS public."RolePermission_id_seq";
DROP TABLE IF EXISTS public."RolePermission";
DROP TABLE IF EXISTS public."Role";
DROP SEQUENCE IF EXISTS public."RecursoTercerizado_id_seq";
DROP TABLE IF EXISTS public."RecursoTercerizado";
DROP SEQUENCE IF EXISTS public."RecursoTercOC_id_seq";
DROP TABLE IF EXISTS public."RecursoTercOC";
DROP SEQUENCE IF EXISTS public."PurchaseOrder_id_seq";
DROP TABLE IF EXISTS public."PurchaseOrder";
DROP SEQUENCE IF EXISTS public."Provision_id_seq";
DROP TABLE IF EXISTS public."Provision";
DROP SEQUENCE IF EXISTS public."Proveedor_id_seq";
DROP TABLE IF EXISTS public."Proveedor";
DROP SEQUENCE IF EXISTS public."Permission_id_seq";
DROP TABLE IF EXISTS public."Permission";
DROP SEQUENCE IF EXISTS public."Period_id_seq";
DROP TABLE IF EXISTS public."Period";
DROP SEQUENCE IF EXISTS public."OC_id_seq";
DROP SEQUENCE IF EXISTS public."OCStatusHistory_id_seq";
DROP TABLE IF EXISTS public."OCStatusHistory";
DROP SEQUENCE IF EXISTS public."OCDocument_id_seq";
DROP TABLE IF EXISTS public."OCDocument";
DROP SEQUENCE IF EXISTS public."OCCostCenter_id_seq";
DROP TABLE IF EXISTS public."OCCostCenter";
DROP TABLE IF EXISTS public."OC";
DROP SEQUENCE IF EXISTS public."Management_id_seq";
DROP TABLE IF EXISTS public."Management";
DROP SEQUENCE IF EXISTS public."Invoice_id_seq";
DROP SEQUENCE IF EXISTS public."InvoiceStatusHistory_id_seq";
DROP TABLE IF EXISTS public."InvoiceStatusHistory";
DROP SEQUENCE IF EXISTS public."InvoicePeriod_id_seq";
DROP TABLE IF EXISTS public."InvoicePeriod";
DROP SEQUENCE IF EXISTS public."InvoiceCostCenter_id_seq";
DROP TABLE IF EXISTS public."InvoiceCostCenter";
DROP TABLE IF EXISTS public."Invoice";
DROP SEQUENCE IF EXISTS public."HistoricoContrato_id_seq";
DROP TABLE IF EXISTS public."HistoricoContrato";
DROP SEQUENCE IF EXISTS public."FxReference_id_seq";
DROP TABLE IF EXISTS public."FxReference";
DROP SEQUENCE IF EXISTS public."ExpensePackage_id_seq";
DROP TABLE IF EXISTS public."ExpensePackage";
DROP SEQUENCE IF EXISTS public."ExpenseConcept_id_seq";
DROP TABLE IF EXISTS public."ExpenseConcept";
DROP SEQUENCE IF EXISTS public."ExchangeRate_id_seq";
DROP TABLE IF EXISTS public."ExchangeRate";
DROP SEQUENCE IF EXISTS public."Document_id_seq";
DROP TABLE IF EXISTS public."Document";
DROP SEQUENCE IF EXISTS public."CostCenter_id_seq";
DROP TABLE IF EXISTS public."CostCenter";
DROP SEQUENCE IF EXISTS public."ControlLine_id_seq";
DROP TABLE IF EXISTS public."ControlLine";
DROP SEQUENCE IF EXISTS public."BudgetVersion_id_seq";
DROP TABLE IF EXISTS public."BudgetVersion";
DROP SEQUENCE IF EXISTS public."BudgetAllocation_id_seq";
DROP TABLE IF EXISTS public."BudgetAllocation";
DROP SEQUENCE IF EXISTS public."Articulo_id_seq";
DROP TABLE IF EXISTS public."Articulo";
DROP SEQUENCE IF EXISTS public."Area_id_seq";
DROP TABLE IF EXISTS public."Area";
DROP SEQUENCE IF EXISTS public."ApprovalThreshold_id_seq";
DROP TABLE IF EXISTS public."ApprovalThreshold";
DROP SEQUENCE IF EXISTS public."AccountingClosure_id_seq";
DROP TABLE IF EXISTS public."AccountingClosure";
DROP FUNCTION IF EXISTS public.fix_utf8(text_input text);
DROP TYPE IF EXISTS public."RecursoStatus";
DROP TYPE IF EXISTS public."OcStatus";
DROP TYPE IF EXISTS public."InvStatus";
DROP TYPE IF EXISTS public."InvDocType";
DROP TYPE IF EXISTS public."ExpenseType";
DROP TYPE IF EXISTS public."DocumentCategory";
DROP TYPE IF EXISTS public."ClType";
DROP TYPE IF EXISTS public."ClState";
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ClState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ClState" AS ENUM (
    'NO_PROCESADO',
    'PROCESADO',
    'PROVISIONADO'
);


--
-- Name: ClType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ClType" AS ENUM (
    'PPTO',
    'RPPTO',
    'GASTO',
    'PROVISION'
);


--
-- Name: DocumentCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocumentCategory" AS ENUM (
    'COTIZACION',
    'FACTURA',
    'CONTRATO',
    'OTRO'
);


--
-- Name: ExpenseType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseType" AS ENUM (
    'ADMINISTRATIVO',
    'PRODUCTO',
    'DISTRIBUIBLE'
);


--
-- Name: InvDocType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvDocType" AS ENUM (
    'FACTURA',
    'NOTA_CREDITO'
);


--
-- Name: InvStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvStatus" AS ENUM (
    'INGRESADO',
    'EN_APROBACION',
    'EN_CONTABILIDAD',
    'EN_TESORERIA',
    'EN_ESPERA_DE_PAGO',
    'PAGADO',
    'RECHAZADO',
    'APROBACION_HEAD',
    'APROBACION_VP'
);


--
-- Name: OcStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OcStatus" AS ENUM (
    'PENDIENTE',
    'PROCESAR',
    'PROCESADO',
    'APROBACION_VP',
    'ANULAR',
    'ANULADO',
    'ATENDER_COMPRAS',
    'ATENDIDO',
    'EN_PROCESO'
);


--
-- Name: RecursoStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecursoStatus" AS ENUM (
    'ACTIVO',
    'CESADO'
);


--
-- Name: fix_utf8(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fix_utf8(text_input text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN 
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(
        REPLACE(text_input,
            '??', '?'),  -- ?
            '??', '?'),  -- ?
            '??', '?'),  -- ?
            '??', '?'),  -- ?
            '??', '?'),  -- ?
            '??', '?'),  -- ?
            '??', '?'),  -- ?
            '???', '?'), -- ?
            '??', '?'),  -- ?
            '??', '?'),  -- ?
            '??', '?'),  -- ?
            '??', '?'),  -- ?
            '??', '?');  -- ? (alternativa)
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AccountingClosure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AccountingClosure" (
    id integer NOT NULL,
    "periodId" integer NOT NULL,
    "receivedAt" timestamp(3) without time zone,
    "sourceRef" text
);


--
-- Name: AccountingClosure_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AccountingClosure_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AccountingClosure_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AccountingClosure_id_seq" OWNED BY public."AccountingClosure".id;


--
-- Name: ApprovalThreshold; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApprovalThreshold" (
    id integer NOT NULL,
    key text NOT NULL,
    description text,
    "amountPEN" numeric(65,30) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ApprovalThreshold_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ApprovalThreshold_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ApprovalThreshold_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ApprovalThreshold_id_seq" OWNED BY public."ApprovalThreshold".id;


--
-- Name: Area; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Area" (
    id integer NOT NULL,
    code text,
    name text NOT NULL,
    "managementId" integer NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: Area_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Area_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Area_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Area_id_seq" OWNED BY public."Area".id;


--
-- Name: Articulo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Articulo" (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL
);


--
-- Name: Articulo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Articulo_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Articulo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Articulo_id_seq" OWNED BY public."Articulo".id;


--
-- Name: BudgetAllocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BudgetAllocation" (
    id integer NOT NULL,
    "versionId" integer NOT NULL,
    "supportId" integer NOT NULL,
    "periodId" integer NOT NULL,
    "amountLocal" numeric(65,30) NOT NULL,
    currency text DEFAULT 'PEN'::text NOT NULL,
    "costCenterId" integer,
    "budgetType" text DEFAULT 'PPTO'::text NOT NULL
);


--
-- Name: BudgetAllocation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."BudgetAllocation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: BudgetAllocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."BudgetAllocation_id_seq" OWNED BY public."BudgetAllocation".id;


--
-- Name: BudgetVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BudgetVersion" (
    id integer NOT NULL,
    name text NOT NULL,
    status text NOT NULL
);


--
-- Name: BudgetVersion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."BudgetVersion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: BudgetVersion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."BudgetVersion_id_seq" OWNED BY public."BudgetVersion".id;


--
-- Name: ControlLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ControlLine" (
    id integer NOT NULL,
    "supportId" integer NOT NULL,
    type public."ClType" NOT NULL,
    state public."ClState" DEFAULT 'NO_PROCESADO'::public."ClState" NOT NULL,
    "periodId" integer NOT NULL,
    "accountingPeriodId" integer,
    "invoiceId" integer,
    "poId" integer,
    description text,
    currency text,
    "amountForeign" numeric(65,30),
    "fxRateProvisional" numeric(65,30) DEFAULT 1.0,
    "fxRateFinal" numeric(65,30),
    "amountLocal" numeric(65,30) NOT NULL,
    "createdBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ControlLine_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ControlLine_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ControlLine_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ControlLine_id_seq" OWNED BY public."ControlLine".id;


--
-- Name: CostCenter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CostCenter" (
    id integer NOT NULL,
    code text NOT NULL,
    name text
);


--
-- Name: CostCenter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CostCenter_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CostCenter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CostCenter_id_seq" OWNED BY public."CostCenter".id;


--
-- Name: Document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Document" (
    id integer NOT NULL,
    "driveFileId" text NOT NULL,
    "driveFolderId" text,
    filename text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer,
    category public."DocumentCategory" DEFAULT 'COTIZACION'::public."DocumentCategory" NOT NULL,
    "uploadedBy" integer,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Document_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Document_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Document_id_seq" OWNED BY public."Document".id;


--
-- Name: ExchangeRate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExchangeRate" (
    id integer NOT NULL,
    year integer NOT NULL,
    rate numeric(65,30) NOT NULL
);


--
-- Name: ExchangeRate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ExchangeRate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ExchangeRate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ExchangeRate_id_seq" OWNED BY public."ExchangeRate".id;


--
-- Name: ExpenseConcept; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExpenseConcept" (
    id integer NOT NULL,
    name text NOT NULL,
    "packageId" integer NOT NULL
);


--
-- Name: ExpenseConcept_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ExpenseConcept_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ExpenseConcept_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ExpenseConcept_id_seq" OWNED BY public."ExpenseConcept".id;


--
-- Name: ExpensePackage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExpensePackage" (
    id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: ExpensePackage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ExpensePackage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ExpensePackage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ExpensePackage_id_seq" OWNED BY public."ExpensePackage".id;


--
-- Name: FxReference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FxReference" (
    id integer NOT NULL,
    currency text NOT NULL,
    rate numeric(65,30) NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone
);


--
-- Name: FxReference_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."FxReference_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FxReference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."FxReference_id_seq" OWNED BY public."FxReference".id;


--
-- Name: HistoricoContrato; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HistoricoContrato" (
    id integer NOT NULL,
    "recursoTercId" integer NOT NULL,
    "fechaInicio" timestamp(3) without time zone NOT NULL,
    "fechaFin" timestamp(3) without time zone NOT NULL,
    "montoMensual" numeric(65,30) NOT NULL,
    "linkContrato" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: HistoricoContrato_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."HistoricoContrato_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: HistoricoContrato_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."HistoricoContrato_id_seq" OWNED BY public."HistoricoContrato".id;


--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invoice" (
    id integer NOT NULL,
    "vendorId" integer,
    "docType" public."InvDocType" DEFAULT 'FACTURA'::public."InvDocType" NOT NULL,
    "numberNorm" text,
    currency text DEFAULT 'PEN'::text NOT NULL,
    "totalForeign" numeric(65,30),
    "totalLocal" numeric(65,30),
    "statusCurrent" public."InvStatus" DEFAULT 'INGRESADO'::public."InvStatus" NOT NULL,
    "ultimusIncident" text,
    "approvedAt" timestamp(3) without time zone,
    "ocId" integer,
    "montoSinIgv" numeric(65,30),
    detalle text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "exchangeRateOverride" numeric(65,30),
    "mesContable" text,
    "tcEstandar" numeric(65,30),
    "tcReal" numeric(65,30),
    "montoPEN_tcEstandar" numeric(65,30),
    "montoPEN_tcReal" numeric(65,30),
    "diferenciaTC" numeric(65,30),
    "supportId" integer,
    "proveedorId" integer
);


--
-- Name: InvoiceCostCenter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InvoiceCostCenter" (
    id integer NOT NULL,
    "invoiceId" integer NOT NULL,
    "costCenterId" integer NOT NULL,
    amount numeric(65,30),
    percentage numeric(65,30),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InvoiceCostCenter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."InvoiceCostCenter_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: InvoiceCostCenter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."InvoiceCostCenter_id_seq" OWNED BY public."InvoiceCostCenter".id;


--
-- Name: InvoicePeriod; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InvoicePeriod" (
    id integer NOT NULL,
    "invoiceId" integer NOT NULL,
    "periodId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InvoicePeriod_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."InvoicePeriod_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: InvoicePeriod_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."InvoicePeriod_id_seq" OWNED BY public."InvoicePeriod".id;


--
-- Name: InvoiceStatusHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InvoiceStatusHistory" (
    id integer NOT NULL,
    "invoiceId" integer NOT NULL,
    status public."InvStatus" NOT NULL,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "changedBy" integer,
    note text
);


--
-- Name: InvoiceStatusHistory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."InvoiceStatusHistory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: InvoiceStatusHistory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."InvoiceStatusHistory_id_seq" OWNED BY public."InvoiceStatusHistory".id;


--
-- Name: Invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Invoice_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Invoice_id_seq" OWNED BY public."Invoice".id;


--
-- Name: Management; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Management" (
    id integer NOT NULL,
    code text,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: Management_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Management_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Management_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Management_id_seq" OWNED BY public."Management".id;


--
-- Name: OC; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OC" (
    id integer NOT NULL,
    "budgetPeriodFromId" integer NOT NULL,
    "budgetPeriodToId" integer NOT NULL,
    "incidenteOc" text,
    "solicitudOc" text,
    "fechaRegistro" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "supportId" integer NOT NULL,
    "periodoEnFechasText" text,
    descripcion text,
    "nombreSolicitante" text NOT NULL,
    "correoSolicitante" text NOT NULL,
    proveedor text,
    ruc text,
    moneda text NOT NULL,
    "importeSinIgv" numeric(65,30) NOT NULL,
    estado public."OcStatus" DEFAULT 'PENDIENTE'::public."OcStatus" NOT NULL,
    "numeroOc" text,
    comentario text,
    "articuloId" integer,
    "cecoId" integer,
    "linkCotizacion" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "proveedorId" integer
);


--
-- Name: OCCostCenter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OCCostCenter" (
    id integer NOT NULL,
    "ocId" integer NOT NULL,
    "costCenterId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OCCostCenter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."OCCostCenter_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OCCostCenter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."OCCostCenter_id_seq" OWNED BY public."OCCostCenter".id;


--
-- Name: OCDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OCDocument" (
    id integer NOT NULL,
    "ocId" integer NOT NULL,
    "documentId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OCDocument_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."OCDocument_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OCDocument_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."OCDocument_id_seq" OWNED BY public."OCDocument".id;


--
-- Name: OCStatusHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OCStatusHistory" (
    id integer NOT NULL,
    "ocId" integer NOT NULL,
    status public."OcStatus" NOT NULL,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "changedBy" integer,
    note text
);


--
-- Name: OCStatusHistory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."OCStatusHistory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OCStatusHistory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."OCStatusHistory_id_seq" OWNED BY public."OCStatusHistory".id;


--
-- Name: OC_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."OC_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OC_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."OC_id_seq" OWNED BY public."OC".id;


--
-- Name: Period; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Period" (
    id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    label text
);


--
-- Name: Period_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Period_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Period_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Period_id_seq" OWNED BY public."Period".id;


--
-- Name: Permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Permission" (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    module text,
    "parentKey" text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: Permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Permission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Permission_id_seq" OWNED BY public."Permission".id;


--
-- Name: Proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Proveedor" (
    id integer NOT NULL,
    "razonSocial" text NOT NULL,
    ruc text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Proveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Proveedor_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Proveedor_id_seq" OWNED BY public."Proveedor".id;


--
-- Name: Provision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Provision" (
    id integer NOT NULL,
    "sustentoId" integer NOT NULL,
    "periodoPpto" text NOT NULL,
    "periodoContable" text NOT NULL,
    "montoPen" numeric(65,30) NOT NULL,
    detalle text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Provision_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Provision_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Provision_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Provision_id_seq" OWNED BY public."Provision".id;


--
-- Name: PurchaseOrder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PurchaseOrder" (
    id integer NOT NULL,
    number text NOT NULL,
    "vendorId" integer,
    "incCode" text
);


--
-- Name: PurchaseOrder_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PurchaseOrder_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PurchaseOrder_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PurchaseOrder_id_seq" OWNED BY public."PurchaseOrder".id;


--
-- Name: RecursoTercOC; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RecursoTercOC" (
    id integer NOT NULL,
    "recursoTercId" integer NOT NULL,
    "ocId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RecursoTercOC_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RecursoTercOC_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RecursoTercOC_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RecursoTercOC_id_seq" OWNED BY public."RecursoTercOC".id;


--
-- Name: RecursoTercerizado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RecursoTercerizado" (
    id integer NOT NULL,
    "nombreCompleto" text NOT NULL,
    cargo text NOT NULL,
    "managementId" integer NOT NULL,
    "proveedorId" integer NOT NULL,
    "supportId" integer,
    "fechaInicio" timestamp(3) without time zone NOT NULL,
    "fechaFin" timestamp(3) without time zone NOT NULL,
    "montoMensual" numeric(65,30) NOT NULL,
    "linkContrato" text,
    status public."RecursoStatus" DEFAULT 'ACTIVO'::public."RecursoStatus" NOT NULL,
    observaciones text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" integer
);


--
-- Name: RecursoTercerizado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RecursoTercerizado_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RecursoTercerizado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RecursoTercerizado_id_seq" OWNED BY public."RecursoTercerizado".id;


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RolePermission" (
    id integer NOT NULL,
    "roleId" integer NOT NULL,
    "permissionId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RolePermission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RolePermission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RolePermission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RolePermission_id_seq" OWNED BY public."RolePermission".id;


--
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: Support; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Support" (
    id integer NOT NULL,
    code text,
    name text NOT NULL,
    "costCenterId" integer,
    management text,
    area text,
    "vendorId" integer,
    active boolean DEFAULT true NOT NULL,
    "expensePackageId" integer,
    "expenseConceptId" integer,
    "expenseType" public."ExpenseType" DEFAULT 'ADMINISTRATIVO'::public."ExpenseType" NOT NULL,
    "managementId" integer,
    "areaId" integer
);


--
-- Name: SupportCostCenter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SupportCostCenter" (
    id integer NOT NULL,
    "supportId" integer NOT NULL,
    "costCenterId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SupportCostCenter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SupportCostCenter_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SupportCostCenter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SupportCostCenter_id_seq" OWNED BY public."SupportCostCenter".id;


--
-- Name: Support_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Support_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Support_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Support_id_seq" OWNED BY public."Support".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    name text,
    "googleId" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserRole" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "roleId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserRole_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."UserRole_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: UserRole_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."UserRole_id_seq" OWNED BY public."UserRole".id;


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: Vendor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Vendor" (
    id integer NOT NULL,
    "legalName" text NOT NULL,
    "taxId" text
);


--
-- Name: Vendor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Vendor_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Vendor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Vendor_id_seq" OWNED BY public."Vendor".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: AccountingClosure id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingClosure" ALTER COLUMN id SET DEFAULT nextval('public."AccountingClosure_id_seq"'::regclass);


--
-- Name: ApprovalThreshold id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalThreshold" ALTER COLUMN id SET DEFAULT nextval('public."ApprovalThreshold_id_seq"'::regclass);


--
-- Name: Area id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Area" ALTER COLUMN id SET DEFAULT nextval('public."Area_id_seq"'::regclass);


--
-- Name: Articulo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Articulo" ALTER COLUMN id SET DEFAULT nextval('public."Articulo_id_seq"'::regclass);


--
-- Name: BudgetAllocation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BudgetAllocation" ALTER COLUMN id SET DEFAULT nextval('public."BudgetAllocation_id_seq"'::regclass);


--
-- Name: BudgetVersion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BudgetVersion" ALTER COLUMN id SET DEFAULT nextval('public."BudgetVersion_id_seq"'::regclass);


--
-- Name: ControlLine id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ControlLine" ALTER COLUMN id SET DEFAULT nextval('public."ControlLine_id_seq"'::regclass);


--
-- Name: CostCenter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostCenter" ALTER COLUMN id SET DEFAULT nextval('public."CostCenter_id_seq"'::regclass);


--
-- Name: Document id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document" ALTER COLUMN id SET DEFAULT nextval('public."Document_id_seq"'::regclass);


--
-- Name: ExchangeRate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExchangeRate" ALTER COLUMN id SET DEFAULT nextval('public."ExchangeRate_id_seq"'::regclass);


--
-- Name: ExpenseConcept id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExpenseConcept" ALTER COLUMN id SET DEFAULT nextval('public."ExpenseConcept_id_seq"'::regclass);


--
-- Name: ExpensePackage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExpensePackage" ALTER COLUMN id SET DEFAULT nextval('public."ExpensePackage_id_seq"'::regclass);


--
-- Name: FxReference id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FxReference" ALTER COLUMN id SET DEFAULT nextval('public."FxReference_id_seq"'::regclass);


--
-- Name: HistoricoContrato id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HistoricoContrato" ALTER COLUMN id SET DEFAULT nextval('public."HistoricoContrato_id_seq"'::regclass);


--
-- Name: Invoice id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice" ALTER COLUMN id SET DEFAULT nextval('public."Invoice_id_seq"'::regclass);


--
-- Name: InvoiceCostCenter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceCostCenter" ALTER COLUMN id SET DEFAULT nextval('public."InvoiceCostCenter_id_seq"'::regclass);


--
-- Name: InvoicePeriod id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoicePeriod" ALTER COLUMN id SET DEFAULT nextval('public."InvoicePeriod_id_seq"'::regclass);


--
-- Name: InvoiceStatusHistory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceStatusHistory" ALTER COLUMN id SET DEFAULT nextval('public."InvoiceStatusHistory_id_seq"'::regclass);


--
-- Name: Management id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Management" ALTER COLUMN id SET DEFAULT nextval('public."Management_id_seq"'::regclass);


--
-- Name: OC id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OC" ALTER COLUMN id SET DEFAULT nextval('public."OC_id_seq"'::regclass);


--
-- Name: OCCostCenter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCCostCenter" ALTER COLUMN id SET DEFAULT nextval('public."OCCostCenter_id_seq"'::regclass);


--
-- Name: OCDocument id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCDocument" ALTER COLUMN id SET DEFAULT nextval('public."OCDocument_id_seq"'::regclass);


--
-- Name: OCStatusHistory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCStatusHistory" ALTER COLUMN id SET DEFAULT nextval('public."OCStatusHistory_id_seq"'::regclass);


--
-- Name: Period id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Period" ALTER COLUMN id SET DEFAULT nextval('public."Period_id_seq"'::regclass);


--
-- Name: Permission id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission" ALTER COLUMN id SET DEFAULT nextval('public."Permission_id_seq"'::regclass);


--
-- Name: Proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Proveedor" ALTER COLUMN id SET DEFAULT nextval('public."Proveedor_id_seq"'::regclass);


--
-- Name: Provision id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Provision" ALTER COLUMN id SET DEFAULT nextval('public."Provision_id_seq"'::regclass);


--
-- Name: PurchaseOrder id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseOrder" ALTER COLUMN id SET DEFAULT nextval('public."PurchaseOrder_id_seq"'::regclass);


--
-- Name: RecursoTercOC id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecursoTercOC" ALTER COLUMN id SET DEFAULT nextval('public."RecursoTercOC_id_seq"'::regclass);


--
-- Name: RecursoTercerizado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecursoTercerizado" ALTER COLUMN id SET DEFAULT nextval('public."RecursoTercerizado_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: RolePermission id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission" ALTER COLUMN id SET DEFAULT nextval('public."RolePermission_id_seq"'::regclass);


--
-- Name: Support id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Support" ALTER COLUMN id SET DEFAULT nextval('public."Support_id_seq"'::regclass);


--
-- Name: SupportCostCenter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SupportCostCenter" ALTER COLUMN id SET DEFAULT nextval('public."SupportCostCenter_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: UserRole id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole" ALTER COLUMN id SET DEFAULT nextval('public."UserRole_id_seq"'::regclass);


--
-- Name: Vendor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vendor" ALTER COLUMN id SET DEFAULT nextval('public."Vendor_id_seq"'::regclass);


--
-- Data for Name: AccountingClosure; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AccountingClosure" (id, "periodId", "receivedAt", "sourceRef") FROM stdin;
\.


--
-- Data for Name: ApprovalThreshold; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApprovalThreshold" (id, key, description, "amountPEN", active, "createdAt", "updatedAt") FROM stdin;
1	INVOICE_VP_THRESHOLD	Umbral para aprobaci?n VP de facturas (monto con IGV en PEN)	10000.000000000000000000000000000000	t	2025-12-18 15:00:36.752	2025-12-18 15:00:36.752
\.


--
-- Data for Name: Area; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Area" (id, code, name, "managementId", active) FROM stdin;
7	\N	Agilidad	4	t
8	\N	Arquitectura	5	t
9	\N	Infraestructura	5	t
11	\N	Gobierno TI	7	t
12	\N	Soporte TI	7	t
14	\N	Comercial	10	t
15	\N	Contraloria	10	t
16	\N	Digital	10	t
17	\N	DO	10	t
18	\N	Experiencia	10	t
19	\N	GDH	10	t
20	\N	Inversiones	10	t
21	\N	Legal	10	t
22	\N	Riesgos	10	t
23	\N	SDI	10	t
24	\N	Tecnica	10	t
25	\N	Tesoreria	10	t
28	\N	Data	14	t
29	\N	QA Team	8	t
30	\N	Desarrollo	8	t
31	\N	Soporte al Negocio	7	t
32	\N	Monitoreo	7	t
33	\N	Business process	7	t
13	\N	Auditor?a	10	t
52	AREA-COM-MKT	Marketing	25	t
53	AREA-COM-VTA	Ventas	25	t
\.


--
-- Data for Name: Articulo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Articulo" (id, code, name) FROM stdin;
5	A0001	ACTIVOS FIJOS E INTANGIBLES
6	B0006	AGUINALDOS, CANASTAS Y REGALOS
7	B0007	ARREGLO FLORAL
8	B0008	BOCADITOS
9	B0009	FOTOCHECKS
10	B0010	KITS DE BIENVENIDA
11	B0011	SOLICITUDES
13	B0014	ARCHIVADORES
14	B0015	CARPETAS, SOBRES, HOJAS MEMBRETADAS
15	B0016	TARJETAS PERSONALES
16	B0017	CARPETAS, BLOCK
17	B0018	HOJAS DE ANALISIS
18	B0019	SOLICITUDES DE SEGURO
19	B0020	VOLANTES
20	B0021	DIPLOMAS
21	B0022	ENTRADAS Y VALES DE COMPRA
22	B0023	MERCHANDISING
23	B0024	MODULOS DE VENTA
24	B0025	AGENDAS
25	B0026	CARAMELOS
26	B0027	CARPETAS
27	B0028	GIFT CARDS
29	B0030	UTILES DE OFICINA
30	B0036	SUMINISTRO DE LINEA INSTITUCIONAL
31	B0037	SUMINISTRO DE MATERIALES
32	B0038	SUMINISTRO DE MOBILIARIO
33	B0039	SUMINISTRO DE TI
34	B0040	SUMINISTROS VARIOS
35	B0041	SERVICIO DE AROMATIZACION
36	B0042	UTILES DE ASEO
37	B0045	INSUMOS DE COCINA
39	B0047	PIZARRAS Y VINIL DE ESCRITURA
40	B0048	PLANTILLAS DE SELLO Y SELLOS
42	B0050	UNIFORMES
44	B0052	RECARGA DE TARJETAS
45	S0001	BD REGULARIZACION EVALUACION Y AUDITORIA
46	S0002	CENTRO DE CONTROL DE OPERACIONES
47	S0003	DIGITACION ESCANEO Y HOSTING DE CERTIFICADOS
48	S0004	EVALUACION AUDITORIA Y EXAMENES MEDICOS
49	S0005	GESTION DE SINIESTROS Y DOCUMENTOS
50	S0016	ACTIVACIONES, EVENTOS Y FIESTAS
51	S0017	ALMUERZOS
52	S0018	ALQUILER DE MOVILIDAD
53	S0019	ENVIOS NACIONALES
54	S0020	EVALUACIONES NUTRICIONAL, PSICOLOGICA
55	S0021	EXAMENES MEDICOS
56	S0022	ESTACIONAMIENTO
57	S0023	MEMBRESIAS
58	S0024	SERV ASESORIA EN SEGURIDAD Y SALUD
59	S0025	SERV DE MEDICO IN HOUSE
61	S0027	SERVICIO DE ENCUESTA INTERNA
62	S0028	SERVICIO DE FOTOGRAFIA Y VIDEO
63	S0029	SESIONES DE COACHING
64	S0030	VERIDATA
65	S0031	SERVICIO IMPLEMENTACION  PROYECTOS
66	S0035	ALMACENAJE MODULOS
67	S0036	ALQUILER DE ESPACIOS PARA LETRERO
68	S0037	ALQUILER ESPACIOS EN PROVINCIAS IBK
69	S0038	GASTOS COMUNES
70	S0039	GASTOS COMUNES Y FIJOS EN PROVINCIAS IBK
71	S0040	GESTION ADMINISTRATIVA OPERATIVA Y MANT
72	S0041	ALQUILERES COMERCIAL
73	S0042	CUSTODIA DE MEDIOS
74	S0043	GESTION DE PROCESOS DE INFORMACION
76	S0045	COMMUNITY MANAGER NOCTURNO
78	S0047	CONSULTORIA GOOGLE ANALYTICS & TAG MANAG
79	S0048	DESIGN THINKING
80	S0049	DIME PREMIUM
81	S0050	INVESTIGACION CUALIT Y CUANTIT
82	S0051	LICENCIAS
83	S0052	PROGRAMA DE BENEFICIOS
84	S0053	SERV DE ENVIOS SMS MKT Y SOAT
85	S0054	SERVICIO WEB Y SOCIAL MEDIA
86	S0058	CONGRESOS, TALLERES, PROGRAMAS
87	S0059	CUOTA DE ASOCIADO UCIC
88	S0060	CUOTA INLIDER
89	S0061	CURSOS, DIPLOMADOS, MAESTRIAS
90	S0062	SERVICIO DE  CONSULTORIA
91	S0063	SERVICIO DE ALOJAMIENTO Y COMIDA
92	S0064	SERVICIOS DE PAUSAS ACTIVAS
93	S0065	SESIONES DE COACHNG
94	S0067	RENDICIONES
95	S0068	ATENCIONES AL PERSONAL
96	S0071	COMISION DELIVERY TOURING - WEBSOAT - ISEND - TLMK
97	S0072	SERVICIO IMPRESION POLIZAS
98	S0073	SERVICIO DISTRIBUCION CARTAS, POLIZAS
99	S0074	SERVICIO DE ENVIOS NACIONALES
100	S0075	SERVICIO DE MENSAJERIA, COBRANZA Y RECOJO
101	S0076	SERVICICO POSTAL
102	S0078	CONFIGURACION DE PRODUCTOS
103	S0079	CONSULTORIAS
104	S0080	DESARROLLO DE APLICACIONES
105	S0081	DESARROLLO DE PROYECTOS
106	S0082	EJECUCION PRUEBAS DE QA
107	S0083	MIGRACIONES
108	S0084	OUTSOURCING
109	S0085	SERVICIOS EXTERNOS
110	S0087	DIARIOS Y SUSCRIPCIONES
111	S0088	SERV. DIGITALIZACION, CONSULTAS, VALIDACIONES
112	S0089	SERVICIO DE IMPRESION
113	S0090	SERV INTERM COLOCACION DEL REASEGURO
114	S0091	SERVICIO  DE AUDITORIA MEDICA
115	S0092	SERVICIO DE AUXILIAR DE OFICINA
116	S0093	SERVICIO DE BENEFICIO MEMORIAL
117	S0094	SERVICIO DE COURIER Y COBRANZAS
118	S0095	SERVICIOS DE SMS
119	S0098	SERVICO DE AGUA
120	S0099	SERVICIO DE LUZ
122	S0104	SERVICO DE TELEFONIA FIJA
123	S0105	SERVICO DE TELEFONIA CELULAR
124	S0106	SERVICIO DE TVCABLE
125	S0107	PRESTACION DE GESTION Y OPERAC DE SEGUROS
126	S0109	SERVICIOS NOTARIALES
127	S0110	SERVICIOS DE REFERIMIENTO
128	S0111	GESTION DE INSPECC Y ATENCION DE ASEGUR
129	S0113	HONORARIOS POR SERVICIOS LEGALES
130	S0114	CUOTA ORDINARIA APESEG
131	S0115	HONORARIOS POR SERVICIOS GENERALES
132	S0117	SERVICIOS DE INTERNET
133	S0119	SERV DE MANTENIMIENTO SE SOFTWARE
134	S0120	SERV DE MANTENIMIENTO SE HARDWARE
135	S0121	SERV DE MANTENIMIENTO DE VEHICULOS
136	S0122	SERV DE EMPASTES DE LIBROS
137	S0123	SERVICIO DE IMPRESION DE SOBRES
138	S0126	SERVICIOS DE SEGURIDAD
139	S0127	SERVICIO DE  MONITOREO ALARMAS
140	S0128	IMPRESION MEMORIA ANUAL
141	S0129	GESTION DE PAUTAS WEB
143	S0131	INVERSION EN MEDIOS
144	S0132	SERV TRADUCCION, GRABACION, EDICION
145	S0133	PUBLICACION EN PRENSA
146	S0134	SERVICIO DE TRADUCCION
147	S0135	SERVICIOS DE  IMPRESION
148	S0136	SERVICIO DE PUBLICIDAD RADIAL
149	S0137	SERVICIOS PROCESOS DE SELECCION
150	S0148	ALQUILER DE DISPENSADORES DE AGUA
151	S0149	ATENCION DE EMERGENCIAS
152	S0150	MANTENIMIENTO COMUNES SEDES
153	S0151	MANTENIMIENTO DE AREAS VERDES
154	S0152	MANTENIMIENTOS CORRECTIVOS
155	S0153	MANTENIMIENTOS PREVENTIVOS
157	S0155	SERVICIO DE COURIER, CONSERJE Y MENSAJERIA
158	S0156	SERVICIO DE LIMPIEZA
159	S0157	SERVICIO DE RECARGA EXTINTORES
160	S0158	SERVICIO DE SUPERVISION DE TRABAJOS
161	S0159	SERVICIO FACILITY MANAGEMENT
162	S0160	SERVICIOS DE TRASLADOS
163	S0161	SERVICIOS VARIOS
164	S0162	SERVICIO DE  FIRMA DIGITAL
165	S0163	BANCARED ENLACE
166	S0164	SERV ALQUILER DE PLATAFORMA
167	S0165	SERV BENEFICIO MEMORIAL ASISTENCIA
168	S0166	SERV DE CONFIGURACION SISTEMA
169	S0167	SERV DE PROCESAMIENTO DE TRAMAS
170	S0168	SERVICIO FTR
171	S0169	SANCIONES ADMINISTRATIVAS FISCALES
172	S0171	POLIZAS DE SEGURO
173	S0174	ALQUILER DE IBM POWER
174	S0175	ALQUILER SERVIDOR POWER
176	S0177	DIGITAL BUSINESS
178	S0179	MANTENIMIENTOS DE SOFTWARE Y HARDWARE
180	S0181	SERVICIO DE ASESORIA Y CONSULTORIA
182	S0183	SERVICIO DE LOCAL IP DATA PUERTA
183	S0184	SERVICIO DE STORAGE BACKUPS
184	S0185	SERVICIO  DE TELEFONIA E INTERNET
185	S0186	SERVICIO DE HOUSING
186	S0187	SERVICIOS DE LEASING
187	S0188	SERVICIOS DE SOPORTE TECNICO
188	S0189	OUTSORCING DE RECURSOS DE SOPORTE E INFRAESTRUCTURA DE TI
189	S0190	SERVICIO LICENCIAMIENTO DE SOFTWARE
190	S0191	SERVICIO CONFIGURACION DE SOFTWARE
207	B0029	MERCHANDISING
208	B0046	MERCHANDISING
209	B0051	UTILES DE OFICINA
210	S0100	SERVICIO DE IMPRESION
211	S0154	SERVICIO DE AUXILIAR DE OFICINA
212	S0176	CONFIGURACION DE PRODUCTOS
213	S0178	LICENCIAS
214	S0180	OUTSOURCING
12	B0012	INSUMOS PARA IMPRESI?N
41	B0049	SE?ALETICAS
60	S0026	SERVICIO DE DISE?O GRAFICO, BRANDING
75	S0044	ASESORIA DISE?O DE CONTENIDO DIGITAL
77	S0046	CONSULTORIA EN DISE?O WEB
142	S0130	SERVICIOS DE DISE?O, IMPRESI?N, BRANDING
181	S0182	SERVICIO DE EQUIPOS DE IMPRESI?N
221	ART-001	Servicios Profesionales
222	ART-002	Licencias de Software
223	ART-003	Hardware y Equipos
\.


--
-- Data for Name: BudgetAllocation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BudgetAllocation" (id, "versionId", "supportId", "periodId", "amountLocal", currency, "costCenterId", "budgetType") FROM stdin;
153	1	24	13	2313.750000000000000000000000000000	PEN	5	PPTO
154	1	24	14	2377.500000000000000000000000000000	PEN	5	PPTO
155	1	24	15	3378.750000000000000000000000000000	PEN	5	PPTO
156	1	24	16	2550.000000000000000000000000000000	PEN	5	PPTO
157	1	24	17	2625.000000000000000000000000000000	PEN	5	PPTO
158	1	24	18	3630.000000000000000000000000000000	PEN	5	PPTO
159	1	24	19	2838.750000000000000000000000000000	PEN	5	PPTO
160	1	24	20	2925.000000000000000000000000000000	PEN	5	PPTO
161	1	24	21	3907.500000000000000000000000000000	PEN	5	PPTO
162	1	24	22	3161.250000000000000000000000000000	PEN	5	PPTO
163	1	24	23	3243.750000000000000000000000000000	PEN	5	PPTO
164	1	24	24	4230.000000000000000000000000000000	PEN	5	PPTO
165	1	24	13	2313.750000000000000000000000000000	PEN	12	PPTO
166	1	24	14	2377.500000000000000000000000000000	PEN	12	PPTO
167	1	24	15	3378.750000000000000000000000000000	PEN	12	PPTO
168	1	24	16	2550.000000000000000000000000000000	PEN	12	PPTO
169	1	24	17	2625.000000000000000000000000000000	PEN	12	PPTO
170	1	24	18	3630.000000000000000000000000000000	PEN	12	PPTO
171	1	24	19	2838.750000000000000000000000000000	PEN	12	PPTO
172	1	24	20	2925.000000000000000000000000000000	PEN	12	PPTO
173	1	24	21	3907.500000000000000000000000000000	PEN	12	PPTO
174	1	24	22	3161.250000000000000000000000000000	PEN	12	PPTO
175	1	24	23	3243.750000000000000000000000000000	PEN	12	PPTO
176	1	24	24	4230.000000000000000000000000000000	PEN	12	PPTO
177	1	24	13	2313.750000000000000000000000000000	PEN	7	PPTO
178	1	24	14	2377.500000000000000000000000000000	PEN	7	PPTO
179	1	24	15	3378.750000000000000000000000000000	PEN	7	PPTO
180	1	24	16	2550.000000000000000000000000000000	PEN	7	PPTO
181	1	24	17	2625.000000000000000000000000000000	PEN	7	PPTO
182	1	24	18	3630.000000000000000000000000000000	PEN	7	PPTO
183	1	24	19	2838.750000000000000000000000000000	PEN	7	PPTO
184	1	24	20	2925.000000000000000000000000000000	PEN	7	PPTO
185	1	24	21	3907.500000000000000000000000000000	PEN	7	PPTO
186	1	24	22	3161.250000000000000000000000000000	PEN	7	PPTO
187	1	24	23	3243.750000000000000000000000000000	PEN	7	PPTO
188	1	24	24	4230.000000000000000000000000000000	PEN	7	PPTO
189	1	24	13	2313.750000000000000000000000000000	PEN	11	PPTO
190	1	24	14	2377.500000000000000000000000000000	PEN	11	PPTO
191	1	24	15	3378.750000000000000000000000000000	PEN	11	PPTO
192	1	24	16	2550.000000000000000000000000000000	PEN	11	PPTO
193	1	24	17	2625.000000000000000000000000000000	PEN	11	PPTO
194	1	24	18	3630.000000000000000000000000000000	PEN	11	PPTO
195	1	24	19	2838.750000000000000000000000000000	PEN	11	PPTO
196	1	24	20	2925.000000000000000000000000000000	PEN	11	PPTO
197	1	24	21	3907.500000000000000000000000000000	PEN	11	PPTO
198	1	24	22	3161.250000000000000000000000000000	PEN	11	PPTO
199	1	24	23	3243.750000000000000000000000000000	PEN	11	PPTO
200	1	24	24	4230.000000000000000000000000000000	PEN	11	PPTO
201	1	24	13	2313.750000000000000000000000000000	PEN	10	PPTO
202	1	24	14	2377.500000000000000000000000000000	PEN	10	PPTO
203	1	24	15	3378.750000000000000000000000000000	PEN	10	PPTO
204	1	24	16	2550.000000000000000000000000000000	PEN	10	PPTO
205	1	24	17	2625.000000000000000000000000000000	PEN	10	PPTO
206	1	24	18	3630.000000000000000000000000000000	PEN	10	PPTO
207	1	24	19	2838.750000000000000000000000000000	PEN	10	PPTO
208	1	24	20	2925.000000000000000000000000000000	PEN	10	PPTO
209	1	24	21	3907.500000000000000000000000000000	PEN	10	PPTO
210	1	24	22	3161.250000000000000000000000000000	PEN	10	PPTO
211	1	24	23	3243.750000000000000000000000000000	PEN	10	PPTO
212	1	24	24	4230.000000000000000000000000000000	PEN	10	PPTO
213	1	72	13	0.000000000000000000000000000000	PEN	22	PPTO
214	1	72	14	0.000000000000000000000000000000	PEN	22	PPTO
215	1	72	15	0.000000000000000000000000000000	PEN	22	PPTO
216	1	72	16	0.000000000000000000000000000000	PEN	22	PPTO
217	1	72	17	0.000000000000000000000000000000	PEN	22	PPTO
218	1	72	18	0.000000000000000000000000000000	PEN	22	PPTO
219	1	72	19	0.000000000000000000000000000000	PEN	22	PPTO
220	1	72	20	162190.350000000000000000000000000000	PEN	22	PPTO
221	1	72	21	0.000000000000000000000000000000	PEN	22	PPTO
222	1	72	22	0.000000000000000000000000000000	PEN	22	PPTO
223	1	72	23	0.000000000000000000000000000000	PEN	22	PPTO
224	1	72	24	0.000000000000000000000000000000	PEN	22	PPTO
225	1	112	13	0.000000000000000000000000000000	PEN	21	PPTO
226	1	112	14	0.000000000000000000000000000000	PEN	21	PPTO
227	1	112	15	0.000000000000000000000000000000	PEN	21	PPTO
228	1	112	16	0.000000000000000000000000000000	PEN	21	PPTO
229	1	112	17	0.000000000000000000000000000000	PEN	21	PPTO
230	1	112	18	37500.000000000000000000000000000000	PEN	21	PPTO
231	1	112	19	0.000000000000000000000000000000	PEN	21	PPTO
232	1	112	20	0.000000000000000000000000000000	PEN	21	PPTO
233	1	112	21	0.000000000000000000000000000000	PEN	21	PPTO
234	1	112	22	0.000000000000000000000000000000	PEN	21	PPTO
235	1	112	23	0.000000000000000000000000000000	PEN	21	PPTO
236	1	112	24	0.000000000000000000000000000000	PEN	21	PPTO
237	1	81	13	724.566666700000000000000000000000	PEN	28	PPTO
238	1	81	14	724.566666700000000000000000000000	PEN	28	PPTO
239	1	81	15	724.566666700000000000000000000000	PEN	28	PPTO
240	1	81	16	724.566666700000000000000000000000	PEN	28	PPTO
241	1	81	17	724.566666700000000000000000000000	PEN	28	PPTO
242	1	81	18	724.566666700000000000000000000000	PEN	28	PPTO
243	1	81	19	724.566666700000000000000000000000	PEN	28	PPTO
244	1	81	20	724.566666700000000000000000000000	PEN	28	PPTO
245	1	81	21	724.566666700000000000000000000000	PEN	28	PPTO
246	1	81	22	724.566666700000000000000000000000	PEN	28	PPTO
247	1	81	23	724.566666700000000000000000000000	PEN	28	PPTO
248	1	81	24	724.566666700000000000000000000000	PEN	28	PPTO
249	1	110	13	0.000000000000000000000000000000	PEN	22	PPTO
250	1	110	14	0.000000000000000000000000000000	PEN	22	PPTO
251	1	110	15	0.000000000000000000000000000000	PEN	22	PPTO
252	1	110	16	0.000000000000000000000000000000	PEN	22	PPTO
253	1	110	17	0.000000000000000000000000000000	PEN	22	PPTO
254	1	110	18	0.000000000000000000000000000000	PEN	22	PPTO
255	1	110	19	47.100000000000000000000000000000	PEN	22	PPTO
256	1	110	20	0.000000000000000000000000000000	PEN	22	PPTO
257	1	110	21	0.000000000000000000000000000000	PEN	22	PPTO
258	1	110	22	0.000000000000000000000000000000	PEN	22	PPTO
259	1	110	23	0.000000000000000000000000000000	PEN	22	PPTO
260	1	110	24	0.000000000000000000000000000000	PEN	22	PPTO
261	1	53	13	125.000000000000000000000000000000	PEN	28	PPTO
262	1	53	14	125.000000000000000000000000000000	PEN	28	PPTO
263	1	53	15	125.000000000000000000000000000000	PEN	28	PPTO
264	1	53	16	125.000000000000000000000000000000	PEN	28	PPTO
265	1	53	17	125.000000000000000000000000000000	PEN	28	PPTO
266	1	53	18	125.000000000000000000000000000000	PEN	28	PPTO
267	1	53	19	125.000000000000000000000000000000	PEN	28	PPTO
268	1	53	20	125.000000000000000000000000000000	PEN	28	PPTO
269	1	53	21	125.000000000000000000000000000000	PEN	28	PPTO
270	1	53	22	125.000000000000000000000000000000	PEN	28	PPTO
271	1	53	23	125.000000000000000000000000000000	PEN	28	PPTO
272	1	53	24	125.000000000000000000000000000000	PEN	28	PPTO
273	1	54	13	1259.700000000000000000000000000000	PEN	15	PPTO
274	1	54	14	1259.700000000000000000000000000000	PEN	15	PPTO
275	1	54	15	1259.700000000000000000000000000000	PEN	15	PPTO
276	1	54	16	1259.700000000000000000000000000000	PEN	15	PPTO
277	1	54	17	1259.700000000000000000000000000000	PEN	15	PPTO
278	1	54	18	1259.700000000000000000000000000000	PEN	15	PPTO
279	1	54	19	1259.700000000000000000000000000000	PEN	15	PPTO
280	1	54	20	1259.700000000000000000000000000000	PEN	15	PPTO
281	1	54	21	1259.700000000000000000000000000000	PEN	15	PPTO
282	1	54	22	1259.700000000000000000000000000000	PEN	15	PPTO
283	1	54	23	1259.700000000000000000000000000000	PEN	15	PPTO
284	1	54	24	1259.700000000000000000000000000000	PEN	15	PPTO
285	1	54	13	2047.010000000000000000000000000000	PEN	13	PPTO
286	1	54	14	2047.010000000000000000000000000000	PEN	13	PPTO
287	1	54	15	2047.010000000000000000000000000000	PEN	13	PPTO
288	1	54	16	2047.010000000000000000000000000000	PEN	13	PPTO
289	1	54	17	2047.010000000000000000000000000000	PEN	13	PPTO
290	1	54	18	2047.010000000000000000000000000000	PEN	13	PPTO
291	1	54	19	2047.010000000000000000000000000000	PEN	13	PPTO
292	1	54	20	2047.010000000000000000000000000000	PEN	13	PPTO
293	1	54	21	2047.010000000000000000000000000000	PEN	13	PPTO
294	1	54	22	2047.010000000000000000000000000000	PEN	13	PPTO
295	1	54	23	2047.010000000000000000000000000000	PEN	13	PPTO
296	1	54	24	2047.010000000000000000000000000000	PEN	13	PPTO
297	1	54	13	4566.400000000000000000000000000000	PEN	14	PPTO
298	1	54	14	4566.400000000000000000000000000000	PEN	14	PPTO
299	1	54	15	4566.400000000000000000000000000000	PEN	14	PPTO
300	1	54	16	4566.400000000000000000000000000000	PEN	14	PPTO
301	1	54	17	4566.400000000000000000000000000000	PEN	14	PPTO
302	1	54	18	4566.400000000000000000000000000000	PEN	14	PPTO
303	1	54	19	4566.400000000000000000000000000000	PEN	14	PPTO
304	1	54	20	4566.400000000000000000000000000000	PEN	14	PPTO
305	1	54	21	4566.400000000000000000000000000000	PEN	14	PPTO
306	1	54	22	4566.400000000000000000000000000000	PEN	14	PPTO
307	1	54	23	4566.400000000000000000000000000000	PEN	14	PPTO
308	1	54	24	4566.400000000000000000000000000000	PEN	14	PPTO
309	1	35	13	575.860000000000000000000000000000	PEN	15	PPTO
310	1	35	14	575.860000000000000000000000000000	PEN	15	PPTO
311	1	35	15	575.860000000000000000000000000000	PEN	15	PPTO
312	1	35	16	575.860000000000000000000000000000	PEN	15	PPTO
313	1	35	17	575.860000000000000000000000000000	PEN	15	PPTO
314	1	35	18	575.860000000000000000000000000000	PEN	15	PPTO
315	1	35	19	575.860000000000000000000000000000	PEN	15	PPTO
316	1	35	20	575.860000000000000000000000000000	PEN	15	PPTO
317	1	35	21	575.860000000000000000000000000000	PEN	15	PPTO
318	1	35	22	575.860000000000000000000000000000	PEN	15	PPTO
319	1	35	23	575.860000000000000000000000000000	PEN	15	PPTO
320	1	35	24	575.860000000000000000000000000000	PEN	15	PPTO
321	1	35	13	935.780000000000000000000000000000	PEN	13	PPTO
322	1	35	14	935.780000000000000000000000000000	PEN	13	PPTO
323	1	35	15	935.780000000000000000000000000000	PEN	13	PPTO
324	1	35	16	935.780000000000000000000000000000	PEN	13	PPTO
325	1	35	17	935.780000000000000000000000000000	PEN	13	PPTO
326	1	35	18	935.780000000000000000000000000000	PEN	13	PPTO
327	1	35	19	935.780000000000000000000000000000	PEN	13	PPTO
328	1	35	20	935.780000000000000000000000000000	PEN	13	PPTO
329	1	35	21	935.780000000000000000000000000000	PEN	13	PPTO
330	1	35	22	935.780000000000000000000000000000	PEN	13	PPTO
331	1	35	23	935.780000000000000000000000000000	PEN	13	PPTO
332	1	35	24	935.780000000000000000000000000000	PEN	13	PPTO
333	1	35	13	2087.500000000000000000000000000000	PEN	14	PPTO
334	1	35	14	2087.500000000000000000000000000000	PEN	14	PPTO
335	1	35	15	2087.500000000000000000000000000000	PEN	14	PPTO
336	1	35	16	2087.500000000000000000000000000000	PEN	14	PPTO
337	1	35	17	2087.500000000000000000000000000000	PEN	14	PPTO
338	1	35	18	2087.500000000000000000000000000000	PEN	14	PPTO
339	1	35	19	2087.500000000000000000000000000000	PEN	14	PPTO
340	1	35	20	2087.500000000000000000000000000000	PEN	14	PPTO
341	1	35	21	2087.500000000000000000000000000000	PEN	14	PPTO
342	1	35	22	2087.500000000000000000000000000000	PEN	14	PPTO
343	1	35	23	2087.500000000000000000000000000000	PEN	14	PPTO
344	1	35	24	2087.500000000000000000000000000000	PEN	14	PPTO
345	1	35	13	3599.140000000000000000000000000000	PEN	9	PPTO
346	1	35	14	3599.140000000000000000000000000000	PEN	9	PPTO
347	1	35	15	3599.140000000000000000000000000000	PEN	9	PPTO
348	1	35	16	3599.140000000000000000000000000000	PEN	9	PPTO
349	1	35	17	3599.140000000000000000000000000000	PEN	9	PPTO
350	1	35	18	3599.140000000000000000000000000000	PEN	9	PPTO
351	1	35	19	3599.140000000000000000000000000000	PEN	9	PPTO
352	1	35	20	3599.140000000000000000000000000000	PEN	9	PPTO
353	1	35	21	3599.140000000000000000000000000000	PEN	9	PPTO
354	1	35	22	3599.140000000000000000000000000000	PEN	9	PPTO
355	1	35	23	3599.140000000000000000000000000000	PEN	9	PPTO
356	1	35	24	3599.140000000000000000000000000000	PEN	9	PPTO
357	1	86	13	461.290000000000000000000000000000	PEN	15	PPTO
358	1	86	14	461.290000000000000000000000000000	PEN	15	PPTO
359	1	86	15	461.290000000000000000000000000000	PEN	15	PPTO
360	1	86	16	461.290000000000000000000000000000	PEN	15	PPTO
361	1	86	17	461.290000000000000000000000000000	PEN	15	PPTO
362	1	86	18	461.290000000000000000000000000000	PEN	15	PPTO
363	1	86	19	461.290000000000000000000000000000	PEN	15	PPTO
364	1	86	20	461.290000000000000000000000000000	PEN	15	PPTO
365	1	86	21	461.290000000000000000000000000000	PEN	15	PPTO
366	1	86	22	461.290000000000000000000000000000	PEN	15	PPTO
367	1	86	23	461.290000000000000000000000000000	PEN	15	PPTO
368	1	86	24	461.290000000000000000000000000000	PEN	15	PPTO
369	1	86	13	749.600000000000000000000000000000	PEN	13	PPTO
370	1	86	14	749.600000000000000000000000000000	PEN	13	PPTO
371	1	86	15	749.600000000000000000000000000000	PEN	13	PPTO
372	1	86	16	749.600000000000000000000000000000	PEN	13	PPTO
373	1	86	17	749.600000000000000000000000000000	PEN	13	PPTO
374	1	86	18	749.600000000000000000000000000000	PEN	13	PPTO
375	1	86	19	749.600000000000000000000000000000	PEN	13	PPTO
376	1	86	20	749.600000000000000000000000000000	PEN	13	PPTO
377	1	86	21	749.600000000000000000000000000000	PEN	13	PPTO
378	1	86	22	749.600000000000000000000000000000	PEN	13	PPTO
379	1	86	23	749.600000000000000000000000000000	PEN	13	PPTO
380	1	86	24	749.600000000000000000000000000000	PEN	13	PPTO
381	1	86	13	1672.170000000000000000000000000000	PEN	14	PPTO
382	1	86	14	1672.170000000000000000000000000000	PEN	14	PPTO
383	1	86	15	1672.170000000000000000000000000000	PEN	14	PPTO
384	1	86	16	1672.170000000000000000000000000000	PEN	14	PPTO
385	1	86	17	1672.170000000000000000000000000000	PEN	14	PPTO
386	1	86	18	1672.170000000000000000000000000000	PEN	14	PPTO
387	1	86	19	1672.170000000000000000000000000000	PEN	14	PPTO
388	1	86	20	1672.170000000000000000000000000000	PEN	14	PPTO
389	1	86	21	1672.170000000000000000000000000000	PEN	14	PPTO
390	1	86	22	1672.170000000000000000000000000000	PEN	14	PPTO
391	1	86	23	1672.170000000000000000000000000000	PEN	14	PPTO
392	1	86	24	1672.170000000000000000000000000000	PEN	14	PPTO
393	1	86	13	2883.060000000000000000000000000000	PEN	9	PPTO
394	1	86	14	2883.060000000000000000000000000000	PEN	9	PPTO
395	1	86	15	2883.060000000000000000000000000000	PEN	9	PPTO
396	1	86	16	2883.060000000000000000000000000000	PEN	9	PPTO
397	1	86	17	2883.060000000000000000000000000000	PEN	9	PPTO
398	1	86	18	2883.060000000000000000000000000000	PEN	9	PPTO
399	1	86	19	2883.060000000000000000000000000000	PEN	9	PPTO
400	1	86	20	2883.060000000000000000000000000000	PEN	9	PPTO
401	1	86	21	2883.060000000000000000000000000000	PEN	9	PPTO
402	1	86	22	2883.060000000000000000000000000000	PEN	9	PPTO
403	1	86	23	2883.060000000000000000000000000000	PEN	9	PPTO
404	1	86	24	2883.060000000000000000000000000000	PEN	9	PPTO
405	1	51	13	0.000000000000000000000000000000	PEN	19	PPTO
406	1	51	14	0.000000000000000000000000000000	PEN	19	PPTO
407	1	51	15	0.000000000000000000000000000000	PEN	19	PPTO
408	1	51	16	0.000000000000000000000000000000	PEN	19	PPTO
409	1	51	17	0.000000000000000000000000000000	PEN	19	PPTO
410	1	51	18	0.000000000000000000000000000000	PEN	19	PPTO
411	1	51	19	0.000000000000000000000000000000	PEN	19	PPTO
412	1	51	20	90000.000000000000000000000000000000	PEN	19	PPTO
413	1	51	21	0.000000000000000000000000000000	PEN	19	PPTO
414	1	51	22	0.000000000000000000000000000000	PEN	19	PPTO
415	1	51	23	0.000000000000000000000000000000	PEN	19	PPTO
416	1	51	24	0.000000000000000000000000000000	PEN	19	PPTO
417	1	90	13	371.250000000000000000000000000000	PEN	19	PPTO
418	1	90	14	371.250000000000000000000000000000	PEN	19	PPTO
419	1	90	15	371.250000000000000000000000000000	PEN	19	PPTO
420	1	90	16	371.250000000000000000000000000000	PEN	19	PPTO
421	1	90	17	371.250000000000000000000000000000	PEN	19	PPTO
422	1	90	18	371.250000000000000000000000000000	PEN	19	PPTO
423	1	90	19	371.250000000000000000000000000000	PEN	19	PPTO
424	1	90	20	371.250000000000000000000000000000	PEN	19	PPTO
425	1	90	21	371.250000000000000000000000000000	PEN	19	PPTO
426	1	90	22	371.250000000000000000000000000000	PEN	19	PPTO
427	1	90	23	371.250000000000000000000000000000	PEN	19	PPTO
428	1	90	24	371.250000000000000000000000000000	PEN	19	PPTO
429	1	99	13	0.000000000000000000000000000000	PEN	19	PPTO
430	1	99	14	0.000000000000000000000000000000	PEN	19	PPTO
431	1	99	15	0.000000000000000000000000000000	PEN	19	PPTO
432	1	99	16	0.000000000000000000000000000000	PEN	19	PPTO
433	1	99	17	0.000000000000000000000000000000	PEN	19	PPTO
434	1	99	18	0.000000000000000000000000000000	PEN	19	PPTO
435	1	99	19	0.000000000000000000000000000000	PEN	19	PPTO
436	1	99	20	0.000000000000000000000000000000	PEN	19	PPTO
437	1	99	21	0.000000000000000000000000000000	PEN	19	PPTO
438	1	99	22	187500.000000000000000000000000000000	PEN	19	PPTO
439	1	99	23	0.000000000000000000000000000000	PEN	19	PPTO
440	1	99	24	0.000000000000000000000000000000	PEN	19	PPTO
441	1	87	13	375.000000000000000000000000000000	PEN	19	PPTO
442	1	87	14	375.000000000000000000000000000000	PEN	19	PPTO
443	1	87	15	375.000000000000000000000000000000	PEN	19	PPTO
444	1	87	16	937.500000000000000000000000000000	PEN	19	PPTO
445	1	87	17	937.500000000000000000000000000000	PEN	19	PPTO
446	1	87	18	937.500000000000000000000000000000	PEN	19	PPTO
447	1	87	19	937.500000000000000000000000000000	PEN	19	PPTO
448	1	87	20	937.500000000000000000000000000000	PEN	19	PPTO
449	1	87	21	937.500000000000000000000000000000	PEN	19	PPTO
450	1	87	22	1875.000000000000000000000000000000	PEN	19	PPTO
451	1	87	23	1875.000000000000000000000000000000	PEN	19	PPTO
452	1	87	24	1875.000000000000000000000000000000	PEN	19	PPTO
453	1	63	13	7875.000000000000000000000000000000	PEN	19	PPTO
454	1	63	14	7875.000000000000000000000000000000	PEN	19	PPTO
455	1	63	15	7875.000000000000000000000000000000	PEN	19	PPTO
456	1	63	16	7875.000000000000000000000000000000	PEN	19	PPTO
457	1	63	17	7875.000000000000000000000000000000	PEN	19	PPTO
458	1	63	18	7875.000000000000000000000000000000	PEN	19	PPTO
459	1	63	19	7875.000000000000000000000000000000	PEN	19	PPTO
460	1	63	20	7875.000000000000000000000000000000	PEN	19	PPTO
461	1	63	21	7875.000000000000000000000000000000	PEN	19	PPTO
462	1	63	22	7875.000000000000000000000000000000	PEN	19	PPTO
463	1	63	23	7875.000000000000000000000000000000	PEN	19	PPTO
464	1	63	24	7875.000000000000000000000000000000	PEN	19	PPTO
465	1	30	13	14437.500000000000000000000000000000	PEN	19	PPTO
466	1	30	14	14437.500000000000000000000000000000	PEN	19	PPTO
467	1	30	15	14437.500000000000000000000000000000	PEN	19	PPTO
468	1	30	16	14437.500000000000000000000000000000	PEN	19	PPTO
469	1	30	17	14437.500000000000000000000000000000	PEN	19	PPTO
470	1	30	18	14437.500000000000000000000000000000	PEN	19	PPTO
471	1	30	19	14437.500000000000000000000000000000	PEN	19	PPTO
472	1	30	20	14437.500000000000000000000000000000	PEN	19	PPTO
473	1	30	21	14437.500000000000000000000000000000	PEN	19	PPTO
474	1	30	22	14437.500000000000000000000000000000	PEN	19	PPTO
475	1	30	23	14437.500000000000000000000000000000	PEN	19	PPTO
476	1	30	24	14437.500000000000000000000000000000	PEN	19	PPTO
477	1	64	13	71.250000000000000000000000000000	PEN	19	PPTO
478	1	64	14	71.250000000000000000000000000000	PEN	19	PPTO
479	1	64	15	71.250000000000000000000000000000	PEN	19	PPTO
480	1	64	16	71.250000000000000000000000000000	PEN	19	PPTO
481	1	64	17	71.250000000000000000000000000000	PEN	19	PPTO
482	1	64	18	71.250000000000000000000000000000	PEN	19	PPTO
483	1	64	19	71.250000000000000000000000000000	PEN	19	PPTO
484	1	64	20	71.250000000000000000000000000000	PEN	19	PPTO
485	1	64	21	71.250000000000000000000000000000	PEN	19	PPTO
486	1	64	22	71.250000000000000000000000000000	PEN	19	PPTO
487	1	64	23	71.250000000000000000000000000000	PEN	19	PPTO
488	1	64	24	71.250000000000000000000000000000	PEN	19	PPTO
489	1	65	13	0.000000000000000000000000000000	PEN	19	PPTO
490	1	65	14	0.000000000000000000000000000000	PEN	19	PPTO
491	1	65	15	0.000000000000000000000000000000	PEN	19	PPTO
492	1	65	16	19500.000000000000000000000000000000	PEN	19	PPTO
493	1	65	17	0.000000000000000000000000000000	PEN	19	PPTO
494	1	65	18	0.000000000000000000000000000000	PEN	19	PPTO
495	1	65	19	0.000000000000000000000000000000	PEN	19	PPTO
496	1	65	20	0.000000000000000000000000000000	PEN	19	PPTO
497	1	65	21	0.000000000000000000000000000000	PEN	19	PPTO
498	1	65	22	0.000000000000000000000000000000	PEN	19	PPTO
499	1	65	23	0.000000000000000000000000000000	PEN	19	PPTO
500	1	65	24	0.000000000000000000000000000000	PEN	19	PPTO
501	1	50	13	937.500000000000000000000000000000	PEN	19	PPTO
502	1	50	14	4687.500000000000000000000000000000	PEN	19	PPTO
503	1	50	15	937.500000000000000000000000000000	PEN	19	PPTO
504	1	50	16	1875.000000000000000000000000000000	PEN	19	PPTO
505	1	50	17	1875.000000000000000000000000000000	PEN	19	PPTO
506	1	50	18	1875.000000000000000000000000000000	PEN	19	PPTO
507	1	50	19	1875.000000000000000000000000000000	PEN	19	PPTO
508	1	50	20	1875.000000000000000000000000000000	PEN	19	PPTO
509	1	50	21	1875.000000000000000000000000000000	PEN	19	PPTO
510	1	50	22	2812.500000000000000000000000000000	PEN	19	PPTO
511	1	50	23	2812.500000000000000000000000000000	PEN	19	PPTO
512	1	50	24	2812.500000000000000000000000000000	PEN	19	PPTO
513	1	61	13	0.000000000000000000000000000000	PEN	19	PPTO
514	1	61	14	0.000000000000000000000000000000	PEN	19	PPTO
515	1	61	15	0.000000000000000000000000000000	PEN	19	PPTO
516	1	61	16	0.000000000000000000000000000000	PEN	19	PPTO
517	1	61	17	0.000000000000000000000000000000	PEN	19	PPTO
518	1	61	18	0.000000000000000000000000000000	PEN	19	PPTO
519	1	61	19	0.000000000000000000000000000000	PEN	19	PPTO
520	1	61	20	371.250000000000000000000000000000	PEN	19	PPTO
521	1	61	21	0.000000000000000000000000000000	PEN	19	PPTO
522	1	61	22	0.000000000000000000000000000000	PEN	19	PPTO
523	1	61	23	0.000000000000000000000000000000	PEN	19	PPTO
524	1	61	24	0.000000000000000000000000000000	PEN	19	PPTO
525	1	76	13	0.000000000000000000000000000000	PEN	19	PPTO
526	1	76	14	0.000000000000000000000000000000	PEN	19	PPTO
527	1	76	15	0.000000000000000000000000000000	PEN	19	PPTO
528	1	76	16	0.000000000000000000000000000000	PEN	19	PPTO
529	1	76	17	0.000000000000000000000000000000	PEN	19	PPTO
530	1	76	18	0.000000000000000000000000000000	PEN	19	PPTO
531	1	76	19	0.000000000000000000000000000000	PEN	19	PPTO
532	1	76	20	0.000000000000000000000000000000	PEN	19	PPTO
533	1	76	21	0.000000000000000000000000000000	PEN	19	PPTO
534	1	76	22	0.000000000000000000000000000000	PEN	19	PPTO
535	1	76	23	0.000000000000000000000000000000	PEN	19	PPTO
536	1	76	24	10312.500000000000000000000000000000	PEN	19	PPTO
537	1	100	13	74062.500000000000000000000000000000	PEN	19	PPTO
538	1	100	14	74062.500000000000000000000000000000	PEN	19	PPTO
539	1	100	15	74062.500000000000000000000000000000	PEN	19	PPTO
540	1	100	16	74062.500000000000000000000000000000	PEN	19	PPTO
541	1	100	17	74062.500000000000000000000000000000	PEN	19	PPTO
542	1	100	18	74062.500000000000000000000000000000	PEN	19	PPTO
543	1	100	19	74062.500000000000000000000000000000	PEN	19	PPTO
544	1	100	20	74062.500000000000000000000000000000	PEN	19	PPTO
545	1	100	21	74062.500000000000000000000000000000	PEN	19	PPTO
546	1	100	22	74062.500000000000000000000000000000	PEN	19	PPTO
547	1	100	23	74062.500000000000000000000000000000	PEN	19	PPTO
548	1	100	24	74062.500000000000000000000000000000	PEN	19	PPTO
549	1	102	13	1350.000000000000000000000000000000	PEN	19	PPTO
550	1	102	14	1350.000000000000000000000000000000	PEN	19	PPTO
551	1	102	15	1350.000000000000000000000000000000	PEN	19	PPTO
552	1	102	16	1350.000000000000000000000000000000	PEN	19	PPTO
553	1	102	17	1350.000000000000000000000000000000	PEN	19	PPTO
554	1	102	18	1350.000000000000000000000000000000	PEN	19	PPTO
555	1	102	19	1350.000000000000000000000000000000	PEN	19	PPTO
556	1	102	20	1350.000000000000000000000000000000	PEN	19	PPTO
557	1	102	21	1350.000000000000000000000000000000	PEN	19	PPTO
558	1	102	22	1350.000000000000000000000000000000	PEN	19	PPTO
559	1	102	23	1350.000000000000000000000000000000	PEN	19	PPTO
560	1	102	24	1350.000000000000000000000000000000	PEN	19	PPTO
561	1	107	13	0.000000000000000000000000000000	PEN	19	PPTO
562	1	107	14	0.000000000000000000000000000000	PEN	19	PPTO
563	1	107	15	5625.000000000000000000000000000000	PEN	19	PPTO
564	1	107	16	0.000000000000000000000000000000	PEN	19	PPTO
565	1	107	17	0.000000000000000000000000000000	PEN	19	PPTO
566	1	107	18	5625.000000000000000000000000000000	PEN	19	PPTO
567	1	107	19	0.000000000000000000000000000000	PEN	19	PPTO
568	1	107	20	0.000000000000000000000000000000	PEN	19	PPTO
569	1	107	21	5625.000000000000000000000000000000	PEN	19	PPTO
570	1	107	22	0.000000000000000000000000000000	PEN	19	PPTO
571	1	107	23	0.000000000000000000000000000000	PEN	19	PPTO
572	1	107	24	5625.000000000000000000000000000000	PEN	19	PPTO
573	1	28	13	1875.000000000000000000000000000000	PEN	19	PPTO
574	1	28	14	1875.000000000000000000000000000000	PEN	19	PPTO
575	1	28	15	1875.000000000000000000000000000000	PEN	19	PPTO
576	1	28	16	1875.000000000000000000000000000000	PEN	19	PPTO
577	1	28	17	1875.000000000000000000000000000000	PEN	19	PPTO
578	1	28	18	1875.000000000000000000000000000000	PEN	19	PPTO
579	1	28	19	1875.000000000000000000000000000000	PEN	19	PPTO
580	1	28	20	1875.000000000000000000000000000000	PEN	19	PPTO
581	1	28	21	1875.000000000000000000000000000000	PEN	19	PPTO
582	1	28	22	1875.000000000000000000000000000000	PEN	19	PPTO
583	1	28	23	1875.000000000000000000000000000000	PEN	19	PPTO
584	1	28	24	1875.000000000000000000000000000000	PEN	19	PPTO
585	1	31	13	2300.000000000000000000000000000000	PEN	19	PPTO
586	1	31	14	0.000000000000000000000000000000	PEN	19	PPTO
587	1	31	15	2300.000000000000000000000000000000	PEN	19	PPTO
588	1	31	16	0.000000000000000000000000000000	PEN	19	PPTO
589	1	31	17	2300.000000000000000000000000000000	PEN	19	PPTO
590	1	31	18	550.000000000000000000000000000000	PEN	19	PPTO
591	1	31	19	0.000000000000000000000000000000	PEN	19	PPTO
592	1	31	20	2300.000000000000000000000000000000	PEN	19	PPTO
593	1	31	21	6900.000000000000000000000000000000	PEN	19	PPTO
594	1	31	22	2300.000000000000000000000000000000	PEN	19	PPTO
595	1	31	23	0.000000000000000000000000000000	PEN	19	PPTO
596	1	31	24	2300.000000000000000000000000000000	PEN	19	PPTO
597	1	58	13	0.000000000000000000000000000000	PEN	19	PPTO
598	1	58	14	0.000000000000000000000000000000	PEN	19	PPTO
599	1	58	15	225000.000000000000000000000000000000	PEN	19	PPTO
600	1	58	16	0.000000000000000000000000000000	PEN	19	PPTO
601	1	58	17	0.000000000000000000000000000000	PEN	19	PPTO
602	1	58	18	0.000000000000000000000000000000	PEN	19	PPTO
603	1	58	19	0.000000000000000000000000000000	PEN	19	PPTO
604	1	58	20	0.000000000000000000000000000000	PEN	19	PPTO
605	1	58	21	0.000000000000000000000000000000	PEN	19	PPTO
606	1	58	22	0.000000000000000000000000000000	PEN	19	PPTO
607	1	58	23	0.000000000000000000000000000000	PEN	19	PPTO
608	1	58	24	0.000000000000000000000000000000	PEN	19	PPTO
609	1	74	13	250.000000000000000000000000000000	PEN	19	PPTO
610	1	74	14	250.000000000000000000000000000000	PEN	19	PPTO
611	1	74	15	250.000000000000000000000000000000	PEN	19	PPTO
612	1	74	16	250.000000000000000000000000000000	PEN	19	PPTO
613	1	74	17	250.000000000000000000000000000000	PEN	19	PPTO
614	1	74	18	250.000000000000000000000000000000	PEN	19	PPTO
615	1	74	19	250.000000000000000000000000000000	PEN	19	PPTO
616	1	74	20	250.000000000000000000000000000000	PEN	19	PPTO
617	1	74	21	250.000000000000000000000000000000	PEN	19	PPTO
618	1	74	22	250.000000000000000000000000000000	PEN	19	PPTO
619	1	74	23	250.000000000000000000000000000000	PEN	19	PPTO
620	1	74	24	250.000000000000000000000000000000	PEN	19	PPTO
621	1	20	13	0.000000000000000000000000000000	PEN	19	PPTO
622	1	20	14	0.000000000000000000000000000000	PEN	19	PPTO
623	1	20	15	0.000000000000000000000000000000	PEN	19	PPTO
624	1	20	16	31875.000000000000000000000000000000	PEN	19	PPTO
625	1	20	17	0.000000000000000000000000000000	PEN	19	PPTO
626	1	20	18	0.000000000000000000000000000000	PEN	19	PPTO
627	1	20	19	0.000000000000000000000000000000	PEN	19	PPTO
628	1	20	20	0.000000000000000000000000000000	PEN	19	PPTO
629	1	20	21	0.000000000000000000000000000000	PEN	19	PPTO
630	1	20	22	0.000000000000000000000000000000	PEN	19	PPTO
631	1	20	23	0.000000000000000000000000000000	PEN	19	PPTO
632	1	20	24	0.000000000000000000000000000000	PEN	19	PPTO
633	1	32	13	2000.000000000000000000000000000000	PEN	19	PPTO
634	1	32	14	2000.000000000000000000000000000000	PEN	19	PPTO
635	1	32	15	2000.000000000000000000000000000000	PEN	19	PPTO
636	1	32	16	2000.000000000000000000000000000000	PEN	19	PPTO
637	1	32	17	2000.000000000000000000000000000000	PEN	19	PPTO
638	1	32	18	2000.000000000000000000000000000000	PEN	19	PPTO
639	1	32	19	2000.000000000000000000000000000000	PEN	19	PPTO
640	1	32	20	2000.000000000000000000000000000000	PEN	19	PPTO
641	1	32	21	2000.000000000000000000000000000000	PEN	19	PPTO
642	1	32	22	2000.000000000000000000000000000000	PEN	19	PPTO
643	1	32	23	2000.000000000000000000000000000000	PEN	19	PPTO
644	1	32	24	2000.000000000000000000000000000000	PEN	19	PPTO
645	1	33	13	0.000000000000000000000000000000	PEN	19	PPTO
646	1	33	14	0.000000000000000000000000000000	PEN	19	PPTO
647	1	33	15	0.000000000000000000000000000000	PEN	19	PPTO
648	1	33	16	0.000000000000000000000000000000	PEN	19	PPTO
649	1	33	17	0.000000000000000000000000000000	PEN	19	PPTO
650	1	33	18	0.000000000000000000000000000000	PEN	19	PPTO
651	1	33	19	12600.000000000000000000000000000000	PEN	19	PPTO
652	1	33	20	0.000000000000000000000000000000	PEN	19	PPTO
653	1	33	21	0.000000000000000000000000000000	PEN	19	PPTO
654	1	33	22	0.000000000000000000000000000000	PEN	19	PPTO
655	1	33	23	0.000000000000000000000000000000	PEN	19	PPTO
656	1	33	24	0.000000000000000000000000000000	PEN	19	PPTO
657	1	52	13	2475.000000000000000000000000000000	PEN	19	PPTO
658	1	52	14	2475.000000000000000000000000000000	PEN	19	PPTO
659	1	52	15	2475.000000000000000000000000000000	PEN	19	PPTO
660	1	52	16	2475.000000000000000000000000000000	PEN	19	PPTO
661	1	52	17	2475.000000000000000000000000000000	PEN	19	PPTO
662	1	52	18	2475.000000000000000000000000000000	PEN	19	PPTO
663	1	52	19	2475.000000000000000000000000000000	PEN	19	PPTO
664	1	52	20	2475.000000000000000000000000000000	PEN	19	PPTO
665	1	52	21	2475.000000000000000000000000000000	PEN	19	PPTO
666	1	52	22	2475.000000000000000000000000000000	PEN	19	PPTO
667	1	52	23	2475.000000000000000000000000000000	PEN	19	PPTO
668	1	52	24	2475.000000000000000000000000000000	PEN	19	PPTO
669	1	101	13	0.000000000000000000000000000000	PEN	19	PPTO
670	1	101	14	0.000000000000000000000000000000	PEN	19	PPTO
671	1	101	15	1875.000000000000000000000000000000	PEN	19	PPTO
672	1	101	16	0.000000000000000000000000000000	PEN	19	PPTO
673	1	101	17	0.000000000000000000000000000000	PEN	19	PPTO
674	1	101	18	1875.000000000000000000000000000000	PEN	19	PPTO
675	1	101	19	0.000000000000000000000000000000	PEN	19	PPTO
676	1	101	20	0.000000000000000000000000000000	PEN	19	PPTO
677	1	101	21	1875.000000000000000000000000000000	PEN	19	PPTO
678	1	101	22	0.000000000000000000000000000000	PEN	19	PPTO
679	1	101	23	0.000000000000000000000000000000	PEN	19	PPTO
680	1	101	24	1875.000000000000000000000000000000	PEN	19	PPTO
681	1	103	13	0.000000000000000000000000000000	PEN	19	PPTO
682	1	103	14	0.000000000000000000000000000000	PEN	19	PPTO
683	1	103	15	1125.000000000000000000000000000000	PEN	19	PPTO
684	1	103	16	0.000000000000000000000000000000	PEN	19	PPTO
685	1	103	17	0.000000000000000000000000000000	PEN	19	PPTO
686	1	103	18	1125.000000000000000000000000000000	PEN	19	PPTO
687	1	103	19	0.000000000000000000000000000000	PEN	19	PPTO
688	1	103	20	0.000000000000000000000000000000	PEN	19	PPTO
689	1	103	21	1125.000000000000000000000000000000	PEN	19	PPTO
690	1	103	22	0.000000000000000000000000000000	PEN	19	PPTO
691	1	103	23	0.000000000000000000000000000000	PEN	19	PPTO
692	1	103	24	1125.000000000000000000000000000000	PEN	19	PPTO
693	1	27	13	0.000000000000000000000000000000	PEN	19	PPTO
694	1	27	14	0.000000000000000000000000000000	PEN	19	PPTO
695	1	27	15	0.000000000000000000000000000000	PEN	19	PPTO
696	1	27	16	0.000000000000000000000000000000	PEN	19	PPTO
697	1	27	17	6000.000000000000000000000000000000	PEN	19	PPTO
698	1	27	18	0.000000000000000000000000000000	PEN	19	PPTO
699	1	27	19	0.000000000000000000000000000000	PEN	19	PPTO
700	1	27	20	6750.000000000000000000000000000000	PEN	19	PPTO
701	1	27	21	0.000000000000000000000000000000	PEN	19	PPTO
702	1	27	22	0.000000000000000000000000000000	PEN	19	PPTO
703	1	27	23	0.000000000000000000000000000000	PEN	19	PPTO
704	1	27	24	0.000000000000000000000000000000	PEN	19	PPTO
705	1	36	13	0.000000000000000000000000000000	PEN	19	PPTO
706	1	36	14	0.000000000000000000000000000000	PEN	19	PPTO
707	1	36	15	0.000000000000000000000000000000	PEN	19	PPTO
708	1	36	16	720.000000000000000000000000000000	PEN	19	PPTO
709	1	36	17	0.000000000000000000000000000000	PEN	19	PPTO
710	1	36	18	0.000000000000000000000000000000	PEN	19	PPTO
711	1	36	19	0.000000000000000000000000000000	PEN	19	PPTO
712	1	36	20	0.000000000000000000000000000000	PEN	19	PPTO
713	1	36	21	0.000000000000000000000000000000	PEN	19	PPTO
714	1	36	22	0.000000000000000000000000000000	PEN	19	PPTO
715	1	36	23	0.000000000000000000000000000000	PEN	19	PPTO
716	1	36	24	0.000000000000000000000000000000	PEN	19	PPTO
717	1	48	13	187.500000000000000000000000000000	PEN	19	PPTO
718	1	48	14	187.500000000000000000000000000000	PEN	19	PPTO
719	1	48	15	187.500000000000000000000000000000	PEN	19	PPTO
720	1	48	16	187.500000000000000000000000000000	PEN	19	PPTO
721	1	48	17	187.500000000000000000000000000000	PEN	19	PPTO
722	1	48	18	187.500000000000000000000000000000	PEN	19	PPTO
723	1	48	19	187.500000000000000000000000000000	PEN	19	PPTO
724	1	48	20	187.500000000000000000000000000000	PEN	19	PPTO
725	1	48	21	187.500000000000000000000000000000	PEN	19	PPTO
726	1	48	22	187.500000000000000000000000000000	PEN	19	PPTO
727	1	48	23	187.500000000000000000000000000000	PEN	19	PPTO
728	1	48	24	187.500000000000000000000000000000	PEN	19	PPTO
729	1	77	13	0.000000000000000000000000000000	PEN	20	PPTO
730	1	77	14	0.000000000000000000000000000000	PEN	20	PPTO
731	1	77	15	0.000000000000000000000000000000	PEN	20	PPTO
732	1	77	16	0.000000000000000000000000000000	PEN	20	PPTO
733	1	77	17	0.000000000000000000000000000000	PEN	20	PPTO
734	1	77	18	0.000000000000000000000000000000	PEN	20	PPTO
735	1	77	19	0.000000000000000000000000000000	PEN	20	PPTO
736	1	77	20	25575.000000000000000000000000000000	PEN	20	PPTO
737	1	77	21	0.000000000000000000000000000000	PEN	20	PPTO
738	1	77	22	0.000000000000000000000000000000	PEN	20	PPTO
739	1	77	23	0.000000000000000000000000000000	PEN	20	PPTO
740	1	77	24	0.000000000000000000000000000000	PEN	20	PPTO
741	1	70	13	5250.000000000000000000000000000000	PEN	20	PPTO
742	1	70	14	5250.000000000000000000000000000000	PEN	20	PPTO
743	1	70	15	5250.000000000000000000000000000000	PEN	20	PPTO
744	1	70	16	5250.000000000000000000000000000000	PEN	20	PPTO
745	1	70	17	5250.000000000000000000000000000000	PEN	20	PPTO
746	1	70	18	5250.000000000000000000000000000000	PEN	20	PPTO
747	1	70	19	5250.000000000000000000000000000000	PEN	20	PPTO
748	1	70	20	5250.000000000000000000000000000000	PEN	20	PPTO
749	1	70	21	5250.000000000000000000000000000000	PEN	20	PPTO
750	1	70	22	5250.000000000000000000000000000000	PEN	20	PPTO
751	1	70	23	5250.000000000000000000000000000000	PEN	20	PPTO
752	1	70	24	5250.000000000000000000000000000000	PEN	20	PPTO
753	1	108	13	94875.000000000000000000000000000000	PEN	20	PPTO
754	1	108	14	0.000000000000000000000000000000	PEN	20	PPTO
755	1	108	15	0.000000000000000000000000000000	PEN	20	PPTO
756	1	108	16	0.000000000000000000000000000000	PEN	20	PPTO
757	1	108	17	0.000000000000000000000000000000	PEN	20	PPTO
758	1	108	18	0.000000000000000000000000000000	PEN	20	PPTO
759	1	108	19	0.000000000000000000000000000000	PEN	20	PPTO
760	1	108	20	0.000000000000000000000000000000	PEN	20	PPTO
761	1	108	21	0.000000000000000000000000000000	PEN	20	PPTO
762	1	108	22	0.000000000000000000000000000000	PEN	20	PPTO
763	1	108	23	0.000000000000000000000000000000	PEN	20	PPTO
764	1	108	24	0.000000000000000000000000000000	PEN	20	PPTO
765	1	62	13	0.000000000000000000000000000000	PEN	20	PPTO
766	1	62	14	0.000000000000000000000000000000	PEN	20	PPTO
767	1	62	15	1875.000000000000000000000000000000	PEN	20	PPTO
768	1	62	16	0.000000000000000000000000000000	PEN	20	PPTO
769	1	62	17	0.000000000000000000000000000000	PEN	20	PPTO
770	1	62	18	0.000000000000000000000000000000	PEN	20	PPTO
771	1	62	19	0.000000000000000000000000000000	PEN	20	PPTO
772	1	62	20	0.000000000000000000000000000000	PEN	20	PPTO
773	1	62	21	0.000000000000000000000000000000	PEN	20	PPTO
774	1	62	22	0.000000000000000000000000000000	PEN	20	PPTO
775	1	62	23	0.000000000000000000000000000000	PEN	20	PPTO
776	1	62	24	0.000000000000000000000000000000	PEN	20	PPTO
777	1	111	13	11250.000000000000000000000000000000	PEN	26	PPTO
778	1	111	14	11250.000000000000000000000000000000	PEN	26	PPTO
779	1	111	15	11250.000000000000000000000000000000	PEN	26	PPTO
780	1	111	16	11250.000000000000000000000000000000	PEN	26	PPTO
781	1	111	17	11250.000000000000000000000000000000	PEN	26	PPTO
782	1	111	18	11250.000000000000000000000000000000	PEN	26	PPTO
783	1	111	19	11250.000000000000000000000000000000	PEN	26	PPTO
784	1	111	20	11250.000000000000000000000000000000	PEN	26	PPTO
785	1	111	21	11250.000000000000000000000000000000	PEN	26	PPTO
786	1	111	22	11250.000000000000000000000000000000	PEN	26	PPTO
787	1	111	23	11250.000000000000000000000000000000	PEN	26	PPTO
788	1	111	24	11250.000000000000000000000000000000	PEN	26	PPTO
789	1	69	13	15000.000000000000000000000000000000	PEN	27	PPTO
790	1	69	14	15000.000000000000000000000000000000	PEN	27	PPTO
791	1	69	15	15000.000000000000000000000000000000	PEN	27	PPTO
792	1	69	16	15000.000000000000000000000000000000	PEN	27	PPTO
793	1	69	17	15000.000000000000000000000000000000	PEN	27	PPTO
794	1	69	18	15000.000000000000000000000000000000	PEN	27	PPTO
795	1	69	19	15000.000000000000000000000000000000	PEN	27	PPTO
796	1	69	20	15000.000000000000000000000000000000	PEN	27	PPTO
797	1	69	21	15000.000000000000000000000000000000	PEN	27	PPTO
798	1	69	22	15000.000000000000000000000000000000	PEN	27	PPTO
799	1	69	23	15000.000000000000000000000000000000	PEN	27	PPTO
800	1	69	24	15000.000000000000000000000000000000	PEN	27	PPTO
801	1	92	13	3750.000000000000000000000000000000	PEN	8	PPTO
802	1	92	14	3750.000000000000000000000000000000	PEN	8	PPTO
803	1	92	15	3750.000000000000000000000000000000	PEN	8	PPTO
804	1	92	16	3750.000000000000000000000000000000	PEN	8	PPTO
805	1	92	17	3750.000000000000000000000000000000	PEN	8	PPTO
806	1	92	18	3750.000000000000000000000000000000	PEN	8	PPTO
807	1	92	19	3750.000000000000000000000000000000	PEN	8	PPTO
808	1	92	20	3750.000000000000000000000000000000	PEN	8	PPTO
809	1	92	21	3750.000000000000000000000000000000	PEN	8	PPTO
810	1	92	22	3750.000000000000000000000000000000	PEN	8	PPTO
811	1	92	23	3750.000000000000000000000000000000	PEN	8	PPTO
812	1	92	24	3750.000000000000000000000000000000	PEN	8	PPTO
813	1	78	13	28125.000000000000000000000000000000	PEN	28	PPTO
814	1	78	14	0.000000000000000000000000000000	PEN	28	PPTO
815	1	78	15	39375.000000000000000000000000000000	PEN	28	PPTO
816	1	78	16	28125.000000000000000000000000000000	PEN	28	PPTO
817	1	78	17	0.000000000000000000000000000000	PEN	28	PPTO
818	1	78	18	39375.000000000000000000000000000000	PEN	28	PPTO
819	1	78	19	28125.000000000000000000000000000000	PEN	28	PPTO
820	1	78	20	0.000000000000000000000000000000	PEN	28	PPTO
821	1	78	21	39375.000000000000000000000000000000	PEN	28	PPTO
822	1	78	22	28125.000000000000000000000000000000	PEN	28	PPTO
823	1	78	23	0.000000000000000000000000000000	PEN	28	PPTO
824	1	78	24	39375.000000000000000000000000000000	PEN	28	PPTO
825	1	25	13	0.000000000000000000000000000000	PEN	28	PPTO
826	1	25	14	0.000000000000000000000000000000	PEN	28	PPTO
827	1	25	15	0.000000000000000000000000000000	PEN	28	PPTO
828	1	25	16	0.000000000000000000000000000000	PEN	28	PPTO
829	1	25	17	0.000000000000000000000000000000	PEN	28	PPTO
830	1	25	18	0.000000000000000000000000000000	PEN	28	PPTO
831	1	25	19	0.000000000000000000000000000000	PEN	28	PPTO
832	1	25	20	0.000000000000000000000000000000	PEN	28	PPTO
833	1	25	21	93750.000000000000000000000000000000	PEN	28	PPTO
834	1	25	22	0.000000000000000000000000000000	PEN	28	PPTO
835	1	25	23	0.000000000000000000000000000000	PEN	28	PPTO
836	1	25	24	0.000000000000000000000000000000	PEN	28	PPTO
837	1	68	13	0.000000000000000000000000000000	PEN	28	PPTO
838	1	68	14	101250.000000000000000000000000000000	PEN	28	PPTO
839	1	68	15	0.000000000000000000000000000000	PEN	28	PPTO
840	1	68	16	0.000000000000000000000000000000	PEN	28	PPTO
841	1	68	17	101250.000000000000000000000000000000	PEN	28	PPTO
842	1	68	18	0.000000000000000000000000000000	PEN	28	PPTO
843	1	68	19	0.000000000000000000000000000000	PEN	28	PPTO
844	1	68	20	101250.000000000000000000000000000000	PEN	28	PPTO
845	1	68	21	0.000000000000000000000000000000	PEN	28	PPTO
846	1	68	22	0.000000000000000000000000000000	PEN	28	PPTO
847	1	68	23	101250.000000000000000000000000000000	PEN	28	PPTO
848	1	68	24	0.000000000000000000000000000000	PEN	28	PPTO
849	1	98	13	5000.000000000000000000000000000000	PEN	28	PPTO
850	1	98	14	5000.000000000000000000000000000000	PEN	28	PPTO
851	1	98	15	5000.000000000000000000000000000000	PEN	28	PPTO
852	1	98	16	5000.000000000000000000000000000000	PEN	28	PPTO
853	1	98	17	5000.000000000000000000000000000000	PEN	28	PPTO
854	1	98	18	5000.000000000000000000000000000000	PEN	28	PPTO
855	1	98	19	5000.000000000000000000000000000000	PEN	28	PPTO
856	1	98	20	5000.000000000000000000000000000000	PEN	28	PPTO
857	1	98	21	5000.000000000000000000000000000000	PEN	28	PPTO
858	1	98	22	5000.000000000000000000000000000000	PEN	28	PPTO
859	1	98	23	5000.000000000000000000000000000000	PEN	28	PPTO
860	1	98	24	5000.000000000000000000000000000000	PEN	28	PPTO
861	1	83	13	0.000000000000000000000000000000	PEN	28	PPTO
862	1	83	14	0.000000000000000000000000000000	PEN	28	PPTO
863	1	83	15	31875.000000000000000000000000000000	PEN	28	PPTO
864	1	83	16	0.000000000000000000000000000000	PEN	28	PPTO
865	1	83	17	0.000000000000000000000000000000	PEN	28	PPTO
866	1	83	18	0.000000000000000000000000000000	PEN	28	PPTO
867	1	83	19	0.000000000000000000000000000000	PEN	28	PPTO
868	1	83	20	0.000000000000000000000000000000	PEN	28	PPTO
869	1	83	21	0.000000000000000000000000000000	PEN	28	PPTO
870	1	83	22	0.000000000000000000000000000000	PEN	28	PPTO
871	1	83	23	0.000000000000000000000000000000	PEN	28	PPTO
872	1	83	24	0.000000000000000000000000000000	PEN	28	PPTO
873	1	71	13	0.000000000000000000000000000000	PEN	24	PPTO
874	1	71	14	68625.000000000000000000000000000000	PEN	24	PPTO
875	1	71	15	0.000000000000000000000000000000	PEN	24	PPTO
876	1	71	16	0.000000000000000000000000000000	PEN	24	PPTO
877	1	71	17	0.000000000000000000000000000000	PEN	24	PPTO
878	1	71	18	0.000000000000000000000000000000	PEN	24	PPTO
879	1	71	19	0.000000000000000000000000000000	PEN	24	PPTO
880	1	71	20	0.000000000000000000000000000000	PEN	24	PPTO
881	1	71	21	0.000000000000000000000000000000	PEN	24	PPTO
882	1	71	22	0.000000000000000000000000000000	PEN	24	PPTO
883	1	71	23	0.000000000000000000000000000000	PEN	24	PPTO
884	1	71	24	0.000000000000000000000000000000	PEN	24	PPTO
885	1	109	13	5625.000000000000000000000000000000	PEN	24	PPTO
886	1	109	14	5625.000000000000000000000000000000	PEN	24	PPTO
887	1	109	15	5625.000000000000000000000000000000	PEN	24	PPTO
888	1	109	16	5625.000000000000000000000000000000	PEN	24	PPTO
889	1	109	17	5625.000000000000000000000000000000	PEN	24	PPTO
890	1	109	18	5625.000000000000000000000000000000	PEN	24	PPTO
891	1	109	19	5625.000000000000000000000000000000	PEN	24	PPTO
892	1	109	20	5625.000000000000000000000000000000	PEN	24	PPTO
893	1	109	21	5625.000000000000000000000000000000	PEN	24	PPTO
894	1	109	22	5625.000000000000000000000000000000	PEN	24	PPTO
895	1	109	23	5625.000000000000000000000000000000	PEN	24	PPTO
896	1	109	24	5625.000000000000000000000000000000	PEN	24	PPTO
897	1	113	13	11250.000000000000000000000000000000	PEN	28	PPTO
898	1	113	14	0.000000000000000000000000000000	PEN	28	PPTO
899	1	113	15	0.000000000000000000000000000000	PEN	28	PPTO
900	1	113	16	11250.000000000000000000000000000000	PEN	28	PPTO
901	1	113	17	0.000000000000000000000000000000	PEN	28	PPTO
902	1	113	18	0.000000000000000000000000000000	PEN	28	PPTO
903	1	113	19	11250.000000000000000000000000000000	PEN	28	PPTO
904	1	113	20	0.000000000000000000000000000000	PEN	28	PPTO
905	1	113	21	0.000000000000000000000000000000	PEN	28	PPTO
906	1	113	22	11250.000000000000000000000000000000	PEN	28	PPTO
907	1	113	23	0.000000000000000000000000000000	PEN	28	PPTO
908	1	113	24	0.000000000000000000000000000000	PEN	28	PPTO
909	1	79	13	0.000000000000000000000000000000	PEN	16	PPTO
910	1	79	14	0.000000000000000000000000000000	PEN	16	PPTO
911	1	79	15	0.000000000000000000000000000000	PEN	16	PPTO
912	1	79	16	0.000000000000000000000000000000	PEN	16	PPTO
913	1	79	17	0.000000000000000000000000000000	PEN	16	PPTO
914	1	79	18	0.000000000000000000000000000000	PEN	16	PPTO
915	1	79	19	0.000000000000000000000000000000	PEN	16	PPTO
916	1	79	20	0.000000000000000000000000000000	PEN	16	PPTO
917	1	79	21	396412.500000000000000000000000000000	PEN	16	PPTO
918	1	79	22	0.000000000000000000000000000000	PEN	16	PPTO
919	1	79	23	0.000000000000000000000000000000	PEN	16	PPTO
920	1	79	24	0.000000000000000000000000000000	PEN	16	PPTO
921	1	80	13	0.000000000000000000000000000000	PEN	25	PPTO
922	1	80	14	0.000000000000000000000000000000	PEN	25	PPTO
923	1	80	15	0.000000000000000000000000000000	PEN	25	PPTO
924	1	80	16	0.000000000000000000000000000000	PEN	25	PPTO
925	1	80	17	123750.000000000000000000000000000000	PEN	25	PPTO
926	1	80	18	61875.000000000000000000000000000000	PEN	25	PPTO
927	1	80	19	0.000000000000000000000000000000	PEN	25	PPTO
928	1	80	20	0.000000000000000000000000000000	PEN	25	PPTO
929	1	80	21	0.000000000000000000000000000000	PEN	25	PPTO
930	1	80	22	0.000000000000000000000000000000	PEN	25	PPTO
931	1	80	23	0.000000000000000000000000000000	PEN	25	PPTO
932	1	80	24	0.000000000000000000000000000000	PEN	25	PPTO
933	1	96	13	24000.000000000000000000000000000000	PEN	19	PPTO
934	1	96	14	24000.000000000000000000000000000000	PEN	19	PPTO
935	1	96	15	24000.000000000000000000000000000000	PEN	19	PPTO
936	1	96	16	24000.000000000000000000000000000000	PEN	19	PPTO
937	1	96	17	24000.000000000000000000000000000000	PEN	19	PPTO
938	1	96	18	24000.000000000000000000000000000000	PEN	19	PPTO
939	1	96	19	24000.000000000000000000000000000000	PEN	19	PPTO
940	1	96	20	24000.000000000000000000000000000000	PEN	19	PPTO
941	1	96	21	24000.000000000000000000000000000000	PEN	19	PPTO
942	1	96	22	24000.000000000000000000000000000000	PEN	19	PPTO
943	1	96	23	24000.000000000000000000000000000000	PEN	19	PPTO
944	1	96	24	24000.000000000000000000000000000000	PEN	19	PPTO
945	1	89	13	27000.000000000000000000000000000000	PEN	19	PPTO
946	1	89	14	27000.000000000000000000000000000000	PEN	19	PPTO
947	1	89	15	27000.000000000000000000000000000000	PEN	19	PPTO
948	1	89	16	27000.000000000000000000000000000000	PEN	19	PPTO
949	1	89	17	27000.000000000000000000000000000000	PEN	19	PPTO
950	1	89	18	27000.000000000000000000000000000000	PEN	19	PPTO
951	1	89	19	27000.000000000000000000000000000000	PEN	19	PPTO
952	1	89	20	27000.000000000000000000000000000000	PEN	19	PPTO
953	1	89	21	27000.000000000000000000000000000000	PEN	19	PPTO
954	1	89	22	27000.000000000000000000000000000000	PEN	19	PPTO
955	1	89	23	27000.000000000000000000000000000000	PEN	19	PPTO
956	1	89	24	27000.000000000000000000000000000000	PEN	19	PPTO
957	1	73	13	2625.000000000000000000000000000000	PEN	19	PPTO
958	1	73	14	2625.000000000000000000000000000000	PEN	19	PPTO
959	1	73	15	2625.000000000000000000000000000000	PEN	19	PPTO
960	1	73	16	2625.000000000000000000000000000000	PEN	19	PPTO
961	1	73	17	4537.500000000000000000000000000000	PEN	19	PPTO
962	1	73	18	3525.000000000000000000000000000000	PEN	19	PPTO
963	1	73	19	2625.000000000000000000000000000000	PEN	19	PPTO
964	1	73	20	2625.000000000000000000000000000000	PEN	19	PPTO
965	1	73	21	2625.000000000000000000000000000000	PEN	19	PPTO
966	1	73	22	2625.000000000000000000000000000000	PEN	19	PPTO
967	1	73	23	2625.000000000000000000000000000000	PEN	19	PPTO
968	1	73	24	2625.000000000000000000000000000000	PEN	19	PPTO
969	1	75	13	0.000000000000000000000000000000	PEN	19	PPTO
970	1	75	14	36750.000000000000000000000000000000	PEN	19	PPTO
971	1	75	15	0.000000000000000000000000000000	PEN	19	PPTO
972	1	75	16	0.000000000000000000000000000000	PEN	19	PPTO
973	1	75	17	0.000000000000000000000000000000	PEN	19	PPTO
974	1	75	18	0.000000000000000000000000000000	PEN	19	PPTO
975	1	75	19	0.000000000000000000000000000000	PEN	19	PPTO
976	1	75	20	0.000000000000000000000000000000	PEN	19	PPTO
977	1	75	21	0.000000000000000000000000000000	PEN	19	PPTO
978	1	75	22	0.000000000000000000000000000000	PEN	19	PPTO
979	1	75	23	0.000000000000000000000000000000	PEN	19	PPTO
980	1	75	24	0.000000000000000000000000000000	PEN	19	PPTO
981	1	29	13	11250.000000000000000000000000000000	PEN	19	PPTO
982	1	29	14	11250.000000000000000000000000000000	PEN	19	PPTO
983	1	29	15	11250.000000000000000000000000000000	PEN	19	PPTO
984	1	29	16	11250.000000000000000000000000000000	PEN	19	PPTO
985	1	29	17	11250.000000000000000000000000000000	PEN	19	PPTO
986	1	29	18	11250.000000000000000000000000000000	PEN	19	PPTO
987	1	29	19	11250.000000000000000000000000000000	PEN	19	PPTO
988	1	29	20	11250.000000000000000000000000000000	PEN	19	PPTO
989	1	29	21	11250.000000000000000000000000000000	PEN	19	PPTO
990	1	29	22	11250.000000000000000000000000000000	PEN	19	PPTO
991	1	29	23	11250.000000000000000000000000000000	PEN	19	PPTO
992	1	29	24	11250.000000000000000000000000000000	PEN	19	PPTO
993	1	91	13	9000.000000000000000000000000000000	PEN	19	PPTO
994	1	91	14	9000.000000000000000000000000000000	PEN	19	PPTO
995	1	91	15	9000.000000000000000000000000000000	PEN	19	PPTO
996	1	91	16	9000.000000000000000000000000000000	PEN	19	PPTO
997	1	91	17	9000.000000000000000000000000000000	PEN	19	PPTO
998	1	91	18	9000.000000000000000000000000000000	PEN	19	PPTO
999	1	91	19	9000.000000000000000000000000000000	PEN	19	PPTO
1000	1	91	20	9000.000000000000000000000000000000	PEN	19	PPTO
1001	1	91	21	9000.000000000000000000000000000000	PEN	19	PPTO
1002	1	91	22	9000.000000000000000000000000000000	PEN	19	PPTO
1003	1	91	23	9000.000000000000000000000000000000	PEN	19	PPTO
1004	1	91	24	9000.000000000000000000000000000000	PEN	19	PPTO
1005	1	82	13	1875.000000000000000000000000000000	PEN	29	PPTO
1006	1	82	14	1875.000000000000000000000000000000	PEN	29	PPTO
1007	1	82	15	1875.000000000000000000000000000000	PEN	29	PPTO
1008	1	82	16	1875.000000000000000000000000000000	PEN	29	PPTO
1009	1	82	17	1875.000000000000000000000000000000	PEN	29	PPTO
1010	1	82	18	1875.000000000000000000000000000000	PEN	29	PPTO
1011	1	82	19	1875.000000000000000000000000000000	PEN	29	PPTO
1012	1	82	20	1875.000000000000000000000000000000	PEN	29	PPTO
1013	1	82	21	1875.000000000000000000000000000000	PEN	29	PPTO
1014	1	82	22	1875.000000000000000000000000000000	PEN	29	PPTO
1015	1	82	23	1875.000000000000000000000000000000	PEN	29	PPTO
1016	1	82	24	1875.000000000000000000000000000000	PEN	29	PPTO
1017	1	93	13	7462.500000000000000000000000000000	PEN	31	PPTO
1018	1	93	14	7462.500000000000000000000000000000	PEN	31	PPTO
1019	1	93	15	7462.500000000000000000000000000000	PEN	31	PPTO
1020	1	93	16	7462.500000000000000000000000000000	PEN	31	PPTO
1021	1	93	17	7462.500000000000000000000000000000	PEN	31	PPTO
1022	1	93	18	7462.500000000000000000000000000000	PEN	31	PPTO
1023	1	93	19	7462.500000000000000000000000000000	PEN	31	PPTO
1024	1	93	20	7462.500000000000000000000000000000	PEN	31	PPTO
1025	1	93	21	7462.500000000000000000000000000000	PEN	31	PPTO
1026	1	93	22	7462.500000000000000000000000000000	PEN	31	PPTO
1027	1	93	23	7462.500000000000000000000000000000	PEN	31	PPTO
1028	1	93	24	7462.500000000000000000000000000000	PEN	31	PPTO
1029	1	94	13	1202.290000000000000000000000000000	PEN	30	PPTO
1030	1	94	14	1202.290000000000000000000000000000	PEN	30	PPTO
1031	1	94	15	1202.290000000000000000000000000000	PEN	30	PPTO
1032	1	94	16	1202.290000000000000000000000000000	PEN	30	PPTO
1033	1	94	17	1202.290000000000000000000000000000	PEN	30	PPTO
1034	1	94	18	1202.290000000000000000000000000000	PEN	30	PPTO
1035	1	94	19	1202.290000000000000000000000000000	PEN	30	PPTO
1036	1	94	20	1202.290000000000000000000000000000	PEN	30	PPTO
1037	1	94	21	1202.290000000000000000000000000000	PEN	30	PPTO
1038	1	94	22	1202.290000000000000000000000000000	PEN	30	PPTO
1039	1	94	23	1202.290000000000000000000000000000	PEN	30	PPTO
1040	1	94	24	1202.290000000000000000000000000000	PEN	30	PPTO
1041	1	95	13	5500.000000000000000000000000000000	PEN	31	PPTO
1042	1	95	14	1459.180000000000000000000000000000	PEN	31	PPTO
1043	1	95	15	1459.180000000000000000000000000000	PEN	31	PPTO
1044	1	95	16	1459.180000000000000000000000000000	PEN	31	PPTO
1045	1	95	17	1459.180000000000000000000000000000	PEN	31	PPTO
1046	1	95	18	1459.180000000000000000000000000000	PEN	31	PPTO
1047	1	95	19	1459.180000000000000000000000000000	PEN	31	PPTO
1048	1	95	20	1459.180000000000000000000000000000	PEN	31	PPTO
1049	1	95	21	1459.180000000000000000000000000000	PEN	31	PPTO
1050	1	95	22	1459.180000000000000000000000000000	PEN	31	PPTO
1051	1	95	23	1459.180000000000000000000000000000	PEN	31	PPTO
1052	1	95	24	1459.180000000000000000000000000000	PEN	31	PPTO
1053	1	40	13	7500.000000000000000000000000000000	PEN	31	PPTO
1054	1	40	14	7500.000000000000000000000000000000	PEN	31	PPTO
1055	1	40	15	7500.000000000000000000000000000000	PEN	31	PPTO
1056	1	40	16	7500.000000000000000000000000000000	PEN	31	PPTO
1057	1	40	17	7500.000000000000000000000000000000	PEN	31	PPTO
1058	1	40	18	7500.000000000000000000000000000000	PEN	31	PPTO
1059	1	40	19	7500.000000000000000000000000000000	PEN	31	PPTO
1060	1	40	20	7500.000000000000000000000000000000	PEN	31	PPTO
1061	1	40	21	7500.000000000000000000000000000000	PEN	31	PPTO
1062	1	40	22	7500.000000000000000000000000000000	PEN	31	PPTO
1063	1	40	23	7500.000000000000000000000000000000	PEN	31	PPTO
1064	1	40	24	7500.000000000000000000000000000000	PEN	31	PPTO
1065	1	22	13	48356.325000000000000000000000000000	PEN	31	PPTO
1066	1	22	14	48356.325000000000000000000000000000	PEN	31	PPTO
1067	1	22	15	48356.325000000000000000000000000000	PEN	31	PPTO
1068	1	22	16	48519.825000000000000000000000000000	PEN	31	PPTO
1069	1	22	17	48654.675000000000000000000000000000	PEN	31	PPTO
1070	1	22	18	48654.675000000000000000000000000000	PEN	31	PPTO
1071	1	22	19	48654.675000000000000000000000000000	PEN	31	PPTO
1072	1	22	20	48654.675000000000000000000000000000	PEN	31	PPTO
1073	1	22	21	48654.675000000000000000000000000000	PEN	31	PPTO
1074	1	22	22	48692.850000000000000000000000000000	PEN	31	PPTO
1075	1	22	23	48692.850000000000000000000000000000	PEN	31	PPTO
1076	1	22	24	48882.337500000000000000000000000000	PEN	31	PPTO
1077	1	67	13	0.000000000000000000000000000000	PEN	31	PPTO
1078	1	67	14	0.000000000000000000000000000000	PEN	31	PPTO
1079	1	67	15	0.000000000000000000000000000000	PEN	31	PPTO
1080	1	67	16	0.000000000000000000000000000000	PEN	31	PPTO
1081	1	67	17	0.000000000000000000000000000000	PEN	31	PPTO
1082	1	67	18	0.000000000000000000000000000000	PEN	31	PPTO
1083	1	67	19	0.000000000000000000000000000000	PEN	31	PPTO
1084	1	67	20	0.000000000000000000000000000000	PEN	31	PPTO
1085	1	67	21	0.000000000000000000000000000000	PEN	31	PPTO
1086	1	67	22	0.000000000000000000000000000000	PEN	31	PPTO
1087	1	67	23	0.000000000000000000000000000000	PEN	31	PPTO
1088	1	67	24	562500.000000000000000000000000000000	PEN	31	PPTO
1089	1	66	13	0.000000000000000000000000000000	PEN	31	PPTO
1090	1	66	14	0.000000000000000000000000000000	PEN	31	PPTO
1091	1	66	15	562.500000000000000000000000000000	PEN	31	PPTO
1092	1	66	16	0.000000000000000000000000000000	PEN	31	PPTO
1093	1	66	17	0.000000000000000000000000000000	PEN	31	PPTO
1094	1	66	18	562.500000000000000000000000000000	PEN	31	PPTO
1095	1	66	19	0.000000000000000000000000000000	PEN	31	PPTO
1096	1	66	20	0.000000000000000000000000000000	PEN	31	PPTO
1097	1	66	21	562.500000000000000000000000000000	PEN	31	PPTO
1098	1	66	22	0.000000000000000000000000000000	PEN	31	PPTO
1099	1	66	23	0.000000000000000000000000000000	PEN	31	PPTO
1100	1	66	24	562.500000000000000000000000000000	PEN	31	PPTO
1101	1	60	13	0.000000000000000000000000000000	PEN	18	PPTO
1102	1	60	14	0.000000000000000000000000000000	PEN	18	PPTO
1103	1	60	15	0.000000000000000000000000000000	PEN	18	PPTO
1104	1	60	16	30000.000000000000000000000000000000	PEN	18	PPTO
1105	1	60	17	0.000000000000000000000000000000	PEN	18	PPTO
1106	1	60	18	0.000000000000000000000000000000	PEN	18	PPTO
1107	1	60	19	37500.000000000000000000000000000000	PEN	18	PPTO
1108	1	60	20	0.000000000000000000000000000000	PEN	18	PPTO
1109	1	60	21	0.000000000000000000000000000000	PEN	18	PPTO
1110	1	60	22	0.000000000000000000000000000000	PEN	18	PPTO
1111	1	60	23	0.000000000000000000000000000000	PEN	18	PPTO
1112	1	60	24	0.000000000000000000000000000000	PEN	18	PPTO
1113	1	59	13	4087.500000000000000000000000000000	PEN	20	PPTO
1114	1	59	14	4087.500000000000000000000000000000	PEN	20	PPTO
1115	1	59	15	4087.500000000000000000000000000000	PEN	20	PPTO
1116	1	59	16	4087.500000000000000000000000000000	PEN	20	PPTO
1117	1	59	17	4087.500000000000000000000000000000	PEN	20	PPTO
1118	1	59	18	4087.500000000000000000000000000000	PEN	20	PPTO
1119	1	59	19	4087.500000000000000000000000000000	PEN	20	PPTO
1120	1	59	20	4087.500000000000000000000000000000	PEN	20	PPTO
1121	1	59	21	4087.500000000000000000000000000000	PEN	20	PPTO
1122	1	59	22	4087.500000000000000000000000000000	PEN	20	PPTO
1123	1	59	23	4087.500000000000000000000000000000	PEN	20	PPTO
1124	1	59	24	4087.500000000000000000000000000000	PEN	20	PPTO
1125	1	97	13	0.000000000000000000000000000000	PEN	20	PPTO
1126	1	97	14	0.000000000000000000000000000000	PEN	20	PPTO
1127	1	97	15	0.000000000000000000000000000000	PEN	20	PPTO
1128	1	97	16	326250.000000000000000000000000000000	PEN	20	PPTO
1129	1	97	17	0.000000000000000000000000000000	PEN	20	PPTO
1130	1	97	18	0.000000000000000000000000000000	PEN	20	PPTO
1131	1	97	19	0.000000000000000000000000000000	PEN	20	PPTO
1132	1	97	20	0.000000000000000000000000000000	PEN	20	PPTO
1133	1	97	21	0.000000000000000000000000000000	PEN	20	PPTO
1134	1	97	22	0.000000000000000000000000000000	PEN	20	PPTO
1135	1	97	23	0.000000000000000000000000000000	PEN	20	PPTO
1136	1	97	24	0.000000000000000000000000000000	PEN	20	PPTO
1137	1	106	13	0.000000000000000000000000000000	PEN	22	PPTO
1138	1	106	14	0.000000000000000000000000000000	PEN	22	PPTO
1139	1	106	15	0.000000000000000000000000000000	PEN	22	PPTO
1140	1	106	16	0.000000000000000000000000000000	PEN	22	PPTO
1141	1	106	17	0.000000000000000000000000000000	PEN	22	PPTO
1142	1	106	18	50000.000000000000000000000000000000	PEN	22	PPTO
1143	1	106	19	0.000000000000000000000000000000	PEN	22	PPTO
1144	1	106	20	0.000000000000000000000000000000	PEN	22	PPTO
1145	1	106	21	0.000000000000000000000000000000	PEN	22	PPTO
1146	1	106	22	0.000000000000000000000000000000	PEN	22	PPTO
1147	1	106	23	0.000000000000000000000000000000	PEN	22	PPTO
1148	1	106	24	0.000000000000000000000000000000	PEN	22	PPTO
1149	1	39	13	60000.000000000000000000000000000000	PEN	22	PPTO
1150	1	39	14	60000.000000000000000000000000000000	PEN	22	PPTO
1151	1	39	15	60000.000000000000000000000000000000	PEN	22	PPTO
1152	1	39	16	60000.000000000000000000000000000000	PEN	22	PPTO
1153	1	39	17	60000.000000000000000000000000000000	PEN	22	PPTO
1154	1	39	18	60000.000000000000000000000000000000	PEN	22	PPTO
1155	1	39	19	60000.000000000000000000000000000000	PEN	22	PPTO
1156	1	39	20	60000.000000000000000000000000000000	PEN	22	PPTO
1157	1	39	21	60000.000000000000000000000000000000	PEN	22	PPTO
1158	1	39	22	60000.000000000000000000000000000000	PEN	22	PPTO
1159	1	39	23	60000.000000000000000000000000000000	PEN	22	PPTO
1160	1	39	24	60000.000000000000000000000000000000	PEN	22	PPTO
1161	1	105	13	15000.000000000000000000000000000000	PEN	19	PPTO
1162	1	105	14	15000.000000000000000000000000000000	PEN	19	PPTO
1163	1	105	15	15000.000000000000000000000000000000	PEN	19	PPTO
1164	1	105	16	15000.000000000000000000000000000000	PEN	19	PPTO
1165	1	105	17	15000.000000000000000000000000000000	PEN	19	PPTO
1166	1	105	18	15000.000000000000000000000000000000	PEN	19	PPTO
1167	1	105	19	15000.000000000000000000000000000000	PEN	19	PPTO
1168	1	105	20	15000.000000000000000000000000000000	PEN	19	PPTO
1169	1	105	21	15000.000000000000000000000000000000	PEN	19	PPTO
1170	1	105	22	15000.000000000000000000000000000000	PEN	19	PPTO
1171	1	105	23	15000.000000000000000000000000000000	PEN	19	PPTO
1172	1	105	24	15000.000000000000000000000000000000	PEN	19	PPTO
1173	1	84	13	0.000000000000000000000000000000	PEN	19	PPTO
1174	1	84	14	0.000000000000000000000000000000	PEN	19	PPTO
1175	1	84	15	0.000000000000000000000000000000	PEN	19	PPTO
1176	1	84	16	0.000000000000000000000000000000	PEN	19	PPTO
1177	1	84	17	50000.000000000000000000000000000000	PEN	19	PPTO
1178	1	84	18	0.000000000000000000000000000000	PEN	19	PPTO
1179	1	84	19	0.000000000000000000000000000000	PEN	19	PPTO
1180	1	84	20	0.000000000000000000000000000000	PEN	19	PPTO
1181	1	84	21	0.000000000000000000000000000000	PEN	19	PPTO
1182	1	84	22	0.000000000000000000000000000000	PEN	19	PPTO
1183	1	84	23	0.000000000000000000000000000000	PEN	19	PPTO
1184	1	84	24	50000.000000000000000000000000000000	PEN	19	PPTO
1185	1	55	13	2992.650000000000000000000000000000	PEN	16	PPTO
1186	1	55	14	2992.650000000000000000000000000000	PEN	16	PPTO
1187	1	55	15	2992.650000000000000000000000000000	PEN	16	PPTO
1188	1	55	16	2992.650000000000000000000000000000	PEN	16	PPTO
1189	1	55	17	2992.650000000000000000000000000000	PEN	16	PPTO
1190	1	55	18	2992.650000000000000000000000000000	PEN	16	PPTO
1191	1	55	19	2992.650000000000000000000000000000	PEN	16	PPTO
1192	1	55	20	2992.650000000000000000000000000000	PEN	16	PPTO
1193	1	55	21	2992.650000000000000000000000000000	PEN	16	PPTO
1194	1	55	22	2992.650000000000000000000000000000	PEN	16	PPTO
1195	1	55	23	2992.650000000000000000000000000000	PEN	16	PPTO
1196	1	55	24	2992.650000000000000000000000000000	PEN	16	PPTO
1197	1	41	13	0.000000000000000000000000000000	PEN	16	PPTO
1198	1	41	14	0.000000000000000000000000000000	PEN	16	PPTO
1199	1	41	15	0.000000000000000000000000000000	PEN	16	PPTO
1200	1	41	16	0.000000000000000000000000000000	PEN	16	PPTO
1201	1	41	17	0.000000000000000000000000000000	PEN	16	PPTO
1202	1	41	18	0.000000000000000000000000000000	PEN	16	PPTO
1203	1	41	19	0.000000000000000000000000000000	PEN	16	PPTO
1204	1	41	20	0.000000000000000000000000000000	PEN	16	PPTO
1205	1	41	21	315000.000000000000000000000000000000	PEN	16	PPTO
1206	1	41	22	0.000000000000000000000000000000	PEN	16	PPTO
1207	1	41	23	0.000000000000000000000000000000	PEN	16	PPTO
1208	1	41	24	0.000000000000000000000000000000	PEN	16	PPTO
1209	1	49	13	300312.825000000000000000000000000000	PEN	19	PPTO
1210	1	49	14	300312.825000000000000000000000000000	PEN	19	PPTO
1211	1	49	15	300312.825000000000000000000000000000	PEN	19	PPTO
1212	1	49	16	301067.775000000000000000000000000000	PEN	19	PPTO
1213	1	49	17	301067.775000000000000000000000000000	PEN	19	PPTO
1214	1	49	18	301067.775000000000000000000000000000	PEN	19	PPTO
1215	1	49	19	303834.300000000000000000000000000000	PEN	19	PPTO
1216	1	49	20	303834.300000000000000000000000000000	PEN	19	PPTO
1217	1	49	21	303834.300000000000000000000000000000	PEN	19	PPTO
1218	1	49	22	304635.187500000000000000000000000000	PEN	19	PPTO
1219	1	49	23	304635.187500000000000000000000000000	PEN	19	PPTO
1220	1	49	24	304635.187500000000000000000000000000	PEN	19	PPTO
1221	1	42	13	86250.000000000000000000000000000000	PEN	19	PPTO
1222	1	42	14	86250.000000000000000000000000000000	PEN	19	PPTO
1223	1	42	15	86250.000000000000000000000000000000	PEN	19	PPTO
1224	1	42	16	86250.000000000000000000000000000000	PEN	19	PPTO
1225	1	42	17	86250.000000000000000000000000000000	PEN	19	PPTO
1226	1	42	18	86250.000000000000000000000000000000	PEN	19	PPTO
1227	1	42	19	86250.000000000000000000000000000000	PEN	19	PPTO
1228	1	42	20	86250.000000000000000000000000000000	PEN	19	PPTO
1229	1	42	21	86250.000000000000000000000000000000	PEN	19	PPTO
1230	1	42	22	86250.000000000000000000000000000000	PEN	19	PPTO
1231	1	42	23	86250.000000000000000000000000000000	PEN	19	PPTO
1232	1	42	24	86250.000000000000000000000000000000	PEN	19	PPTO
1233	1	88	13	124687.500000000000000000000000000000	PEN	19	PPTO
1234	1	88	14	124687.500000000000000000000000000000	PEN	19	PPTO
1235	1	88	15	124687.500000000000000000000000000000	PEN	19	PPTO
1236	1	88	16	124687.500000000000000000000000000000	PEN	19	PPTO
1237	1	88	17	124687.500000000000000000000000000000	PEN	19	PPTO
1238	1	88	18	124687.500000000000000000000000000000	PEN	19	PPTO
1239	1	88	19	124687.500000000000000000000000000000	PEN	19	PPTO
1240	1	88	20	124687.500000000000000000000000000000	PEN	19	PPTO
1241	1	88	21	124687.500000000000000000000000000000	PEN	19	PPTO
1242	1	88	22	124687.500000000000000000000000000000	PEN	19	PPTO
1243	1	88	23	124687.500000000000000000000000000000	PEN	19	PPTO
1244	1	88	24	124687.500000000000000000000000000000	PEN	19	PPTO
1245	1	26	13	0.000000000000000000000000000000	PEN	19	PPTO
1246	1	26	14	0.000000000000000000000000000000	PEN	19	PPTO
1247	1	26	15	0.000000000000000000000000000000	PEN	19	PPTO
1248	1	26	16	0.000000000000000000000000000000	PEN	19	PPTO
1249	1	26	17	0.000000000000000000000000000000	PEN	19	PPTO
1250	1	26	18	0.000000000000000000000000000000	PEN	19	PPTO
1251	1	26	19	0.000000000000000000000000000000	PEN	19	PPTO
1252	1	26	20	0.000000000000000000000000000000	PEN	19	PPTO
1253	1	26	21	82500.000000000000000000000000000000	PEN	19	PPTO
1254	1	26	22	0.000000000000000000000000000000	PEN	19	PPTO
1255	1	26	23	0.000000000000000000000000000000	PEN	19	PPTO
1256	1	26	24	0.000000000000000000000000000000	PEN	19	PPTO
1257	1	43	13	3750.000000000000000000000000000000	PEN	5	PPTO
1258	1	43	14	3750.000000000000000000000000000000	PEN	5	PPTO
1259	1	43	15	3750.000000000000000000000000000000	PEN	5	PPTO
1260	1	43	16	3750.000000000000000000000000000000	PEN	5	PPTO
1261	1	43	17	3750.000000000000000000000000000000	PEN	5	PPTO
1262	1	43	18	3750.000000000000000000000000000000	PEN	5	PPTO
1263	1	43	19	3750.000000000000000000000000000000	PEN	5	PPTO
1264	1	43	20	3750.000000000000000000000000000000	PEN	5	PPTO
1265	1	43	21	3750.000000000000000000000000000000	PEN	5	PPTO
1266	1	43	22	3750.000000000000000000000000000000	PEN	5	PPTO
1267	1	43	23	3750.000000000000000000000000000000	PEN	5	PPTO
1268	1	43	24	3750.000000000000000000000000000000	PEN	5	PPTO
1269	1	44	13	2625.000000000000000000000000000000	PEN	6	PPTO
1270	1	44	14	2625.000000000000000000000000000000	PEN	6	PPTO
1271	1	44	15	2625.000000000000000000000000000000	PEN	6	PPTO
1272	1	44	16	2625.000000000000000000000000000000	PEN	6	PPTO
1273	1	44	17	2625.000000000000000000000000000000	PEN	6	PPTO
1274	1	44	18	2625.000000000000000000000000000000	PEN	6	PPTO
1275	1	44	19	2625.000000000000000000000000000000	PEN	6	PPTO
1276	1	44	20	2625.000000000000000000000000000000	PEN	6	PPTO
1277	1	44	21	2625.000000000000000000000000000000	PEN	6	PPTO
1278	1	44	22	2625.000000000000000000000000000000	PEN	6	PPTO
1279	1	44	23	2625.000000000000000000000000000000	PEN	6	PPTO
1280	1	44	24	2625.000000000000000000000000000000	PEN	6	PPTO
1281	1	45	13	5250.000000000000000000000000000000	PEN	12	PPTO
1282	1	45	14	5250.000000000000000000000000000000	PEN	12	PPTO
1283	1	45	15	5250.000000000000000000000000000000	PEN	12	PPTO
1284	1	45	16	5250.000000000000000000000000000000	PEN	12	PPTO
1285	1	45	17	5250.000000000000000000000000000000	PEN	12	PPTO
1286	1	45	18	5250.000000000000000000000000000000	PEN	12	PPTO
1287	1	45	19	5250.000000000000000000000000000000	PEN	12	PPTO
1288	1	45	20	5250.000000000000000000000000000000	PEN	12	PPTO
1289	1	45	21	5250.000000000000000000000000000000	PEN	12	PPTO
1290	1	45	22	5250.000000000000000000000000000000	PEN	12	PPTO
1291	1	45	23	5250.000000000000000000000000000000	PEN	12	PPTO
1292	1	45	24	5250.000000000000000000000000000000	PEN	12	PPTO
1293	1	47	13	11359.500000000000000000000000000000	PEN	7	PPTO
1294	1	47	14	11359.500000000000000000000000000000	PEN	7	PPTO
1295	1	47	15	11359.500000000000000000000000000000	PEN	7	PPTO
1296	1	47	16	11359.500000000000000000000000000000	PEN	7	PPTO
1297	1	47	17	11359.500000000000000000000000000000	PEN	7	PPTO
1298	1	47	18	11359.500000000000000000000000000000	PEN	7	PPTO
1299	1	47	19	14794.050000000000000000000000000000	PEN	7	PPTO
1300	1	47	20	14794.050000000000000000000000000000	PEN	7	PPTO
1301	1	47	21	14794.050000000000000000000000000000	PEN	7	PPTO
1302	1	47	22	14794.050000000000000000000000000000	PEN	7	PPTO
1303	1	47	23	14794.050000000000000000000000000000	PEN	7	PPTO
1304	1	47	24	14794.050000000000000000000000000000	PEN	7	PPTO
1305	1	46	13	5250.000000000000000000000000000000	PEN	11	PPTO
1306	1	46	14	5250.000000000000000000000000000000	PEN	11	PPTO
1307	1	46	15	5250.000000000000000000000000000000	PEN	11	PPTO
1308	1	46	16	5250.000000000000000000000000000000	PEN	11	PPTO
1309	1	46	17	5250.000000000000000000000000000000	PEN	11	PPTO
1310	1	46	18	5250.000000000000000000000000000000	PEN	11	PPTO
1311	1	46	19	5250.000000000000000000000000000000	PEN	11	PPTO
1312	1	46	20	5250.000000000000000000000000000000	PEN	11	PPTO
1313	1	46	21	5250.000000000000000000000000000000	PEN	11	PPTO
1314	1	46	22	5250.000000000000000000000000000000	PEN	11	PPTO
1315	1	46	23	5250.000000000000000000000000000000	PEN	11	PPTO
1316	1	46	24	5250.000000000000000000000000000000	PEN	11	PPTO
1317	1	21	13	25800.000000000000000000000000000000	PEN	19	PPTO
1318	1	21	14	25800.000000000000000000000000000000	PEN	19	PPTO
1319	1	21	15	25800.000000000000000000000000000000	PEN	19	PPTO
1320	1	21	16	25800.000000000000000000000000000000	PEN	19	PPTO
1321	1	21	17	25800.000000000000000000000000000000	PEN	19	PPTO
1322	1	21	18	25800.000000000000000000000000000000	PEN	19	PPTO
1323	1	21	19	25800.000000000000000000000000000000	PEN	19	PPTO
1324	1	21	20	25800.000000000000000000000000000000	PEN	19	PPTO
1325	1	21	21	25800.000000000000000000000000000000	PEN	19	PPTO
1326	1	21	22	25800.000000000000000000000000000000	PEN	19	PPTO
1327	1	21	23	25800.000000000000000000000000000000	PEN	19	PPTO
1328	1	21	24	25800.000000000000000000000000000000	PEN	19	PPTO
1329	1	85	13	30000.000000000000000000000000000000	PEN	19	PPTO
1330	1	85	14	30000.000000000000000000000000000000	PEN	19	PPTO
1331	1	85	15	30000.000000000000000000000000000000	PEN	19	PPTO
1332	1	85	16	30000.000000000000000000000000000000	PEN	19	PPTO
1333	1	85	17	30000.000000000000000000000000000000	PEN	19	PPTO
1334	1	85	18	30000.000000000000000000000000000000	PEN	19	PPTO
1335	1	85	19	30000.000000000000000000000000000000	PEN	19	PPTO
1336	1	85	20	30000.000000000000000000000000000000	PEN	19	PPTO
1337	1	85	21	30000.000000000000000000000000000000	PEN	19	PPTO
1338	1	85	22	30000.000000000000000000000000000000	PEN	19	PPTO
1339	1	85	23	30000.000000000000000000000000000000	PEN	19	PPTO
1340	1	85	24	30000.000000000000000000000000000000	PEN	19	PPTO
1341	1	104	13	16500.000000000000000000000000000000	PEN	19	PPTO
1342	1	104	14	16500.000000000000000000000000000000	PEN	19	PPTO
1343	1	104	15	16500.000000000000000000000000000000	PEN	19	PPTO
1344	1	104	16	16500.000000000000000000000000000000	PEN	19	PPTO
1345	1	104	17	16500.000000000000000000000000000000	PEN	19	PPTO
1346	1	104	18	16500.000000000000000000000000000000	PEN	19	PPTO
1347	1	104	19	16500.000000000000000000000000000000	PEN	19	PPTO
1348	1	104	20	16500.000000000000000000000000000000	PEN	19	PPTO
1349	1	104	21	16500.000000000000000000000000000000	PEN	19	PPTO
1350	1	104	22	16500.000000000000000000000000000000	PEN	19	PPTO
1351	1	104	23	16500.000000000000000000000000000000	PEN	19	PPTO
1352	1	104	24	16500.000000000000000000000000000000	PEN	19	PPTO
1353	1	56	13	12000.000000000000000000000000000000	PEN	19	PPTO
1354	1	56	14	12000.000000000000000000000000000000	PEN	19	PPTO
1355	1	56	15	12000.000000000000000000000000000000	PEN	19	PPTO
1356	1	56	16	12000.000000000000000000000000000000	PEN	19	PPTO
1357	1	56	17	12000.000000000000000000000000000000	PEN	19	PPTO
1358	1	56	18	12000.000000000000000000000000000000	PEN	19	PPTO
1359	1	56	19	14000.000000000000000000000000000000	PEN	19	PPTO
1360	1	56	20	14000.000000000000000000000000000000	PEN	19	PPTO
1361	1	56	21	14000.000000000000000000000000000000	PEN	19	PPTO
1362	1	56	22	14000.000000000000000000000000000000	PEN	19	PPTO
1363	1	56	23	14000.000000000000000000000000000000	PEN	19	PPTO
1364	1	56	24	14000.000000000000000000000000000000	PEN	19	PPTO
1365	1	34	13	15375.000000000000000000000000000000	PEN	22	PPTO
1366	1	34	14	15375.000000000000000000000000000000	PEN	22	PPTO
1367	1	34	15	15375.000000000000000000000000000000	PEN	22	PPTO
1368	1	34	16	15375.000000000000000000000000000000	PEN	22	PPTO
1369	1	34	17	15375.000000000000000000000000000000	PEN	22	PPTO
1370	1	34	18	15375.000000000000000000000000000000	PEN	22	PPTO
1371	1	34	19	15375.000000000000000000000000000000	PEN	22	PPTO
1372	1	34	20	15375.000000000000000000000000000000	PEN	22	PPTO
1373	1	34	21	15375.000000000000000000000000000000	PEN	22	PPTO
1374	1	34	22	15375.000000000000000000000000000000	PEN	22	PPTO
1375	1	34	23	15375.000000000000000000000000000000	PEN	22	PPTO
1376	1	34	24	15375.000000000000000000000000000000	PEN	22	PPTO
1377	1	23	13	0.000000000000000000000000000000	PEN	22	PPTO
1378	1	23	14	0.000000000000000000000000000000	PEN	22	PPTO
1379	1	23	15	5000.000000000000000000000000000000	PEN	22	PPTO
1380	1	23	16	0.000000000000000000000000000000	PEN	22	PPTO
1381	1	23	17	0.000000000000000000000000000000	PEN	22	PPTO
1382	1	23	18	5000.000000000000000000000000000000	PEN	22	PPTO
1383	1	23	19	0.000000000000000000000000000000	PEN	22	PPTO
1384	1	23	20	0.000000000000000000000000000000	PEN	22	PPTO
1385	1	23	21	5000.000000000000000000000000000000	PEN	22	PPTO
1386	1	23	22	0.000000000000000000000000000000	PEN	22	PPTO
1387	1	23	23	0.000000000000000000000000000000	PEN	22	PPTO
1388	1	23	24	5000.000000000000000000000000000000	PEN	22	PPTO
1389	1	57	13	0.000000000000000000000000000000	PEN	22	PPTO
1390	1	57	14	0.000000000000000000000000000000	PEN	22	PPTO
1391	1	57	15	7000.000000000000000000000000000000	PEN	22	PPTO
1392	1	57	16	0.000000000000000000000000000000	PEN	22	PPTO
1393	1	57	17	0.000000000000000000000000000000	PEN	22	PPTO
1394	1	57	18	7000.000000000000000000000000000000	PEN	22	PPTO
1395	1	57	19	0.000000000000000000000000000000	PEN	22	PPTO
1396	1	57	20	0.000000000000000000000000000000	PEN	22	PPTO
1397	1	57	21	7000.000000000000000000000000000000	PEN	22	PPTO
1398	1	57	22	0.000000000000000000000000000000	PEN	22	PPTO
1399	1	57	23	0.000000000000000000000000000000	PEN	22	PPTO
1400	1	57	24	7000.000000000000000000000000000000	PEN	22	PPTO
1401	1	38	13	0.000000000000000000000000000000	PEN	22	PPTO
1402	1	38	14	0.000000000000000000000000000000	PEN	22	PPTO
1403	1	38	15	0.000000000000000000000000000000	PEN	22	PPTO
1404	1	38	16	0.000000000000000000000000000000	PEN	22	PPTO
1405	1	38	17	0.000000000000000000000000000000	PEN	22	PPTO
1406	1	38	18	0.000000000000000000000000000000	PEN	22	PPTO
1407	1	38	19	45000.000000000000000000000000000000	PEN	22	PPTO
1408	1	38	20	0.000000000000000000000000000000	PEN	22	PPTO
1409	1	38	21	0.000000000000000000000000000000	PEN	22	PPTO
1410	1	38	22	0.000000000000000000000000000000	PEN	22	PPTO
1411	1	38	23	0.000000000000000000000000000000	PEN	22	PPTO
1412	1	38	24	0.000000000000000000000000000000	PEN	22	PPTO
1413	1	37	13	-33333.333330000000000000000000000000	PEN	19	PPTO
1414	1	37	14	-33333.333330000000000000000000000000	PEN	19	PPTO
1415	1	37	15	-33333.333330000000000000000000000000	PEN	19	PPTO
1416	1	37	16	-33333.333330000000000000000000000000	PEN	19	PPTO
1417	1	37	17	-33333.333330000000000000000000000000	PEN	19	PPTO
1418	1	37	18	-33333.333330000000000000000000000000	PEN	19	PPTO
1419	1	37	19	-33333.333330000000000000000000000000	PEN	19	PPTO
1420	1	37	20	-33333.333330000000000000000000000000	PEN	19	PPTO
1421	1	37	21	-33333.333330000000000000000000000000	PEN	19	PPTO
1422	1	37	22	-33333.333330000000000000000000000000	PEN	19	PPTO
1423	1	37	23	-33333.333330000000000000000000000000	PEN	19	PPTO
1424	1	37	24	-33333.333330000000000000000000000000	PEN	19	PPTO
2698	1	37	13	-33333.333330000000000000000000000000	PEN	19	RPPTO
2699	1	37	14	-33333.333330000000000000000000000000	PEN	19	RPPTO
2700	1	37	15	-33333.333330000000000000000000000000	PEN	19	RPPTO
2701	1	37	16	-33333.333330000000000000000000000000	PEN	19	RPPTO
2702	1	37	17	-33333.333330000000000000000000000000	PEN	19	RPPTO
2703	1	37	18	-33333.333330000000000000000000000000	PEN	19	RPPTO
2704	1	37	19	-33333.333330000000000000000000000000	PEN	19	RPPTO
2705	1	37	20	-33333.333330000000000000000000000000	PEN	19	RPPTO
2706	1	37	21	-33333.333330000000000000000000000000	PEN	19	RPPTO
2707	1	37	22	-33333.333330000000000000000000000000	PEN	19	RPPTO
2708	1	37	23	-33333.333330000000000000000000000000	PEN	19	RPPTO
2709	1	37	24	-33333.333330000000000000000000000000	PEN	19	RPPTO
2710	1	24	13	2313.750000000000000000000000000000	PEN	5	RPPTO
2711	1	24	14	2377.500000000000000000000000000000	PEN	5	RPPTO
2712	1	24	15	3378.750000000000000000000000000000	PEN	5	RPPTO
2713	1	24	16	2550.000000000000000000000000000000	PEN	5	RPPTO
2714	1	24	17	2625.000000000000000000000000000000	PEN	5	RPPTO
2715	1	24	18	3630.000000000000000000000000000000	PEN	5	RPPTO
2716	1	24	19	2838.750000000000000000000000000000	PEN	5	RPPTO
2717	1	24	20	2925.000000000000000000000000000000	PEN	5	RPPTO
2718	1	24	21	3907.500000000000000000000000000000	PEN	5	RPPTO
2719	1	24	22	3161.250000000000000000000000000000	PEN	5	RPPTO
2720	1	24	23	3243.750000000000000000000000000000	PEN	5	RPPTO
2721	1	24	24	4230.000000000000000000000000000000	PEN	5	RPPTO
2722	1	24	13	2313.750000000000000000000000000000	PEN	12	RPPTO
2723	1	24	14	2377.500000000000000000000000000000	PEN	12	RPPTO
2724	1	24	15	3378.750000000000000000000000000000	PEN	12	RPPTO
2725	1	24	16	2550.000000000000000000000000000000	PEN	12	RPPTO
2726	1	24	17	2625.000000000000000000000000000000	PEN	12	RPPTO
2727	1	24	18	3630.000000000000000000000000000000	PEN	12	RPPTO
2728	1	24	19	2838.750000000000000000000000000000	PEN	12	RPPTO
2729	1	24	20	2925.000000000000000000000000000000	PEN	12	RPPTO
2730	1	24	21	3907.500000000000000000000000000000	PEN	12	RPPTO
2731	1	24	22	3161.250000000000000000000000000000	PEN	12	RPPTO
2732	1	24	23	3243.750000000000000000000000000000	PEN	12	RPPTO
2733	1	24	24	4230.000000000000000000000000000000	PEN	12	RPPTO
2734	1	24	13	2313.750000000000000000000000000000	PEN	7	RPPTO
2735	1	24	14	2377.500000000000000000000000000000	PEN	7	RPPTO
2736	1	24	15	3378.750000000000000000000000000000	PEN	7	RPPTO
2737	1	24	16	2550.000000000000000000000000000000	PEN	7	RPPTO
2738	1	24	17	2625.000000000000000000000000000000	PEN	7	RPPTO
2739	1	24	18	3630.000000000000000000000000000000	PEN	7	RPPTO
2740	1	24	19	2838.750000000000000000000000000000	PEN	7	RPPTO
2741	1	24	20	2925.000000000000000000000000000000	PEN	7	RPPTO
2742	1	24	21	3907.500000000000000000000000000000	PEN	7	RPPTO
2743	1	24	22	3161.250000000000000000000000000000	PEN	7	RPPTO
2744	1	24	23	3243.750000000000000000000000000000	PEN	7	RPPTO
2745	1	24	24	4230.000000000000000000000000000000	PEN	7	RPPTO
2746	1	24	13	2313.750000000000000000000000000000	PEN	11	RPPTO
2747	1	24	14	2377.500000000000000000000000000000	PEN	11	RPPTO
2748	1	24	15	3378.750000000000000000000000000000	PEN	11	RPPTO
2749	1	24	16	2550.000000000000000000000000000000	PEN	11	RPPTO
2750	1	24	17	2625.000000000000000000000000000000	PEN	11	RPPTO
2751	1	24	18	3630.000000000000000000000000000000	PEN	11	RPPTO
2752	1	24	19	2838.750000000000000000000000000000	PEN	11	RPPTO
2753	1	24	20	2925.000000000000000000000000000000	PEN	11	RPPTO
2754	1	24	21	3907.500000000000000000000000000000	PEN	11	RPPTO
2755	1	24	22	3161.250000000000000000000000000000	PEN	11	RPPTO
2756	1	24	23	3243.750000000000000000000000000000	PEN	11	RPPTO
2757	1	24	24	4230.000000000000000000000000000000	PEN	11	RPPTO
2758	1	24	13	2313.750000000000000000000000000000	PEN	10	RPPTO
2759	1	24	14	2377.500000000000000000000000000000	PEN	10	RPPTO
2760	1	24	15	3378.750000000000000000000000000000	PEN	10	RPPTO
2761	1	24	16	2550.000000000000000000000000000000	PEN	10	RPPTO
2762	1	24	17	2625.000000000000000000000000000000	PEN	10	RPPTO
2763	1	24	18	3630.000000000000000000000000000000	PEN	10	RPPTO
2764	1	24	19	2838.750000000000000000000000000000	PEN	10	RPPTO
2765	1	24	20	2925.000000000000000000000000000000	PEN	10	RPPTO
2766	1	24	21	3907.500000000000000000000000000000	PEN	10	RPPTO
2767	1	24	22	3161.250000000000000000000000000000	PEN	10	RPPTO
2768	1	24	23	3243.750000000000000000000000000000	PEN	10	RPPTO
2769	1	24	24	4230.000000000000000000000000000000	PEN	10	RPPTO
2770	1	72	13	0.000000000000000000000000000000	PEN	22	RPPTO
2771	1	72	14	0.000000000000000000000000000000	PEN	22	RPPTO
2772	1	72	15	0.000000000000000000000000000000	PEN	22	RPPTO
2773	1	72	16	0.000000000000000000000000000000	PEN	22	RPPTO
2774	1	72	17	0.000000000000000000000000000000	PEN	22	RPPTO
2775	1	72	18	0.000000000000000000000000000000	PEN	22	RPPTO
2776	1	72	19	0.000000000000000000000000000000	PEN	22	RPPTO
2777	1	72	20	162190.350000000000000000000000000000	PEN	22	RPPTO
2778	1	72	21	0.000000000000000000000000000000	PEN	22	RPPTO
2779	1	72	22	0.000000000000000000000000000000	PEN	22	RPPTO
2780	1	72	23	0.000000000000000000000000000000	PEN	22	RPPTO
2781	1	72	24	0.000000000000000000000000000000	PEN	22	RPPTO
2782	1	112	13	0.000000000000000000000000000000	PEN	21	RPPTO
2783	1	112	14	0.000000000000000000000000000000	PEN	21	RPPTO
2784	1	112	15	0.000000000000000000000000000000	PEN	21	RPPTO
2785	1	112	16	0.000000000000000000000000000000	PEN	21	RPPTO
2786	1	112	17	0.000000000000000000000000000000	PEN	21	RPPTO
2787	1	112	18	37500.000000000000000000000000000000	PEN	21	RPPTO
2788	1	112	19	0.000000000000000000000000000000	PEN	21	RPPTO
2789	1	112	20	0.000000000000000000000000000000	PEN	21	RPPTO
2790	1	112	21	0.000000000000000000000000000000	PEN	21	RPPTO
2791	1	112	22	0.000000000000000000000000000000	PEN	21	RPPTO
2792	1	112	23	0.000000000000000000000000000000	PEN	21	RPPTO
2793	1	112	24	0.000000000000000000000000000000	PEN	21	RPPTO
2794	1	81	13	724.566666700000000000000000000000	PEN	28	RPPTO
2795	1	81	14	724.566666700000000000000000000000	PEN	28	RPPTO
2796	1	81	15	724.566666700000000000000000000000	PEN	28	RPPTO
2797	1	81	16	724.566666700000000000000000000000	PEN	28	RPPTO
2798	1	81	17	724.566666700000000000000000000000	PEN	28	RPPTO
2799	1	81	18	724.566666700000000000000000000000	PEN	28	RPPTO
2800	1	81	19	724.566666700000000000000000000000	PEN	28	RPPTO
2801	1	81	20	724.566666700000000000000000000000	PEN	28	RPPTO
2802	1	81	21	724.566666700000000000000000000000	PEN	28	RPPTO
2803	1	81	22	724.566666700000000000000000000000	PEN	28	RPPTO
2804	1	81	23	724.566666700000000000000000000000	PEN	28	RPPTO
2805	1	81	24	724.566666700000000000000000000000	PEN	28	RPPTO
2806	1	110	13	0.000000000000000000000000000000	PEN	22	RPPTO
2807	1	110	14	0.000000000000000000000000000000	PEN	22	RPPTO
2808	1	110	15	0.000000000000000000000000000000	PEN	22	RPPTO
2809	1	110	16	0.000000000000000000000000000000	PEN	22	RPPTO
2810	1	110	17	0.000000000000000000000000000000	PEN	22	RPPTO
2811	1	110	18	0.000000000000000000000000000000	PEN	22	RPPTO
2812	1	110	19	47.100000000000000000000000000000	PEN	22	RPPTO
2813	1	110	20	0.000000000000000000000000000000	PEN	22	RPPTO
2814	1	110	21	0.000000000000000000000000000000	PEN	22	RPPTO
2815	1	110	22	0.000000000000000000000000000000	PEN	22	RPPTO
2816	1	110	23	0.000000000000000000000000000000	PEN	22	RPPTO
2817	1	110	24	0.000000000000000000000000000000	PEN	22	RPPTO
2818	1	53	13	125.000000000000000000000000000000	PEN	28	RPPTO
2819	1	53	14	125.000000000000000000000000000000	PEN	28	RPPTO
2820	1	53	15	125.000000000000000000000000000000	PEN	28	RPPTO
2821	1	53	16	125.000000000000000000000000000000	PEN	28	RPPTO
2822	1	53	17	125.000000000000000000000000000000	PEN	28	RPPTO
2823	1	53	18	125.000000000000000000000000000000	PEN	28	RPPTO
2824	1	53	19	125.000000000000000000000000000000	PEN	28	RPPTO
2825	1	53	20	125.000000000000000000000000000000	PEN	28	RPPTO
2826	1	53	21	125.000000000000000000000000000000	PEN	28	RPPTO
2827	1	53	22	125.000000000000000000000000000000	PEN	28	RPPTO
2828	1	53	23	125.000000000000000000000000000000	PEN	28	RPPTO
2829	1	53	24	125.000000000000000000000000000000	PEN	28	RPPTO
2830	1	54	13	1259.700000000000000000000000000000	PEN	15	RPPTO
2831	1	54	14	1259.700000000000000000000000000000	PEN	15	RPPTO
2832	1	54	15	1259.700000000000000000000000000000	PEN	15	RPPTO
2833	1	54	16	1259.700000000000000000000000000000	PEN	15	RPPTO
2834	1	54	17	1259.700000000000000000000000000000	PEN	15	RPPTO
2835	1	54	18	1259.700000000000000000000000000000	PEN	15	RPPTO
2836	1	54	19	1259.700000000000000000000000000000	PEN	15	RPPTO
2837	1	54	20	1259.700000000000000000000000000000	PEN	15	RPPTO
2838	1	54	21	1259.700000000000000000000000000000	PEN	15	RPPTO
2839	1	54	22	1259.700000000000000000000000000000	PEN	15	RPPTO
2840	1	54	23	1259.700000000000000000000000000000	PEN	15	RPPTO
2841	1	54	24	1259.700000000000000000000000000000	PEN	15	RPPTO
2842	1	54	13	2047.010000000000000000000000000000	PEN	13	RPPTO
2843	1	54	14	2047.010000000000000000000000000000	PEN	13	RPPTO
2844	1	54	15	2047.010000000000000000000000000000	PEN	13	RPPTO
2845	1	54	16	2047.010000000000000000000000000000	PEN	13	RPPTO
2846	1	54	17	2047.010000000000000000000000000000	PEN	13	RPPTO
2847	1	54	18	2047.010000000000000000000000000000	PEN	13	RPPTO
2848	1	54	19	2047.010000000000000000000000000000	PEN	13	RPPTO
2849	1	54	20	2047.010000000000000000000000000000	PEN	13	RPPTO
2850	1	54	21	2047.010000000000000000000000000000	PEN	13	RPPTO
2851	1	54	22	2047.010000000000000000000000000000	PEN	13	RPPTO
2852	1	54	23	2047.010000000000000000000000000000	PEN	13	RPPTO
2853	1	54	24	2047.010000000000000000000000000000	PEN	13	RPPTO
2854	1	54	13	4566.400000000000000000000000000000	PEN	14	RPPTO
2855	1	54	14	4566.400000000000000000000000000000	PEN	14	RPPTO
2856	1	54	15	4566.400000000000000000000000000000	PEN	14	RPPTO
2857	1	54	16	4566.400000000000000000000000000000	PEN	14	RPPTO
2858	1	54	17	4566.400000000000000000000000000000	PEN	14	RPPTO
2859	1	54	18	4566.400000000000000000000000000000	PEN	14	RPPTO
2860	1	54	19	4566.400000000000000000000000000000	PEN	14	RPPTO
2861	1	54	20	4566.400000000000000000000000000000	PEN	14	RPPTO
2862	1	54	21	4566.400000000000000000000000000000	PEN	14	RPPTO
2863	1	54	22	4566.400000000000000000000000000000	PEN	14	RPPTO
2864	1	54	23	4566.400000000000000000000000000000	PEN	14	RPPTO
2865	1	54	24	4566.400000000000000000000000000000	PEN	14	RPPTO
2866	1	35	13	575.860000000000000000000000000000	PEN	15	RPPTO
2867	1	35	14	575.860000000000000000000000000000	PEN	15	RPPTO
2868	1	35	15	575.860000000000000000000000000000	PEN	15	RPPTO
2869	1	35	16	575.860000000000000000000000000000	PEN	15	RPPTO
2870	1	35	17	575.860000000000000000000000000000	PEN	15	RPPTO
2871	1	35	18	575.860000000000000000000000000000	PEN	15	RPPTO
2872	1	35	19	575.860000000000000000000000000000	PEN	15	RPPTO
2873	1	35	20	575.860000000000000000000000000000	PEN	15	RPPTO
2874	1	35	21	575.860000000000000000000000000000	PEN	15	RPPTO
2875	1	35	22	575.860000000000000000000000000000	PEN	15	RPPTO
2876	1	35	23	575.860000000000000000000000000000	PEN	15	RPPTO
2877	1	35	24	575.860000000000000000000000000000	PEN	15	RPPTO
2878	1	35	13	935.780000000000000000000000000000	PEN	13	RPPTO
2879	1	35	14	935.780000000000000000000000000000	PEN	13	RPPTO
2880	1	35	15	935.780000000000000000000000000000	PEN	13	RPPTO
2881	1	35	16	935.780000000000000000000000000000	PEN	13	RPPTO
2882	1	35	17	935.780000000000000000000000000000	PEN	13	RPPTO
2883	1	35	18	935.780000000000000000000000000000	PEN	13	RPPTO
2884	1	35	19	935.780000000000000000000000000000	PEN	13	RPPTO
2885	1	35	20	935.780000000000000000000000000000	PEN	13	RPPTO
2886	1	35	21	935.780000000000000000000000000000	PEN	13	RPPTO
2887	1	35	22	935.780000000000000000000000000000	PEN	13	RPPTO
2888	1	35	23	935.780000000000000000000000000000	PEN	13	RPPTO
2889	1	35	24	935.780000000000000000000000000000	PEN	13	RPPTO
2890	1	35	13	3000.000000000000000000000000000000	PEN	14	RPPTO
2891	1	35	14	3000.000000000000000000000000000000	PEN	14	RPPTO
2892	1	35	15	3000.000000000000000000000000000000	PEN	14	RPPTO
2893	1	35	16	2087.500000000000000000000000000000	PEN	14	RPPTO
2894	1	35	17	2087.500000000000000000000000000000	PEN	14	RPPTO
2895	1	35	18	2087.500000000000000000000000000000	PEN	14	RPPTO
2896	1	35	19	2087.500000000000000000000000000000	PEN	14	RPPTO
2897	1	35	20	2087.500000000000000000000000000000	PEN	14	RPPTO
2898	1	35	21	2087.500000000000000000000000000000	PEN	14	RPPTO
2899	1	35	22	2087.500000000000000000000000000000	PEN	14	RPPTO
2900	1	35	23	2087.500000000000000000000000000000	PEN	14	RPPTO
2901	1	35	24	2087.500000000000000000000000000000	PEN	14	RPPTO
2902	1	35	13	3599.140000000000000000000000000000	PEN	9	RPPTO
2903	1	35	14	3599.140000000000000000000000000000	PEN	9	RPPTO
2904	1	35	15	3599.140000000000000000000000000000	PEN	9	RPPTO
2905	1	35	16	3599.140000000000000000000000000000	PEN	9	RPPTO
2906	1	35	17	3599.140000000000000000000000000000	PEN	9	RPPTO
2907	1	35	18	3599.140000000000000000000000000000	PEN	9	RPPTO
2908	1	35	19	3599.140000000000000000000000000000	PEN	9	RPPTO
2909	1	35	20	3599.140000000000000000000000000000	PEN	9	RPPTO
2910	1	35	21	3599.140000000000000000000000000000	PEN	9	RPPTO
2911	1	35	22	3599.140000000000000000000000000000	PEN	9	RPPTO
2912	1	35	23	3599.140000000000000000000000000000	PEN	9	RPPTO
2913	1	35	24	3599.140000000000000000000000000000	PEN	9	RPPTO
2914	1	86	13	461.290000000000000000000000000000	PEN	15	RPPTO
2915	1	86	14	461.290000000000000000000000000000	PEN	15	RPPTO
2916	1	86	15	461.290000000000000000000000000000	PEN	15	RPPTO
2917	1	86	16	461.290000000000000000000000000000	PEN	15	RPPTO
2918	1	86	17	461.290000000000000000000000000000	PEN	15	RPPTO
2919	1	86	18	461.290000000000000000000000000000	PEN	15	RPPTO
2920	1	86	19	461.290000000000000000000000000000	PEN	15	RPPTO
2921	1	86	20	461.290000000000000000000000000000	PEN	15	RPPTO
2922	1	86	21	461.290000000000000000000000000000	PEN	15	RPPTO
2923	1	86	22	461.290000000000000000000000000000	PEN	15	RPPTO
2924	1	86	23	461.290000000000000000000000000000	PEN	15	RPPTO
2925	1	86	24	461.290000000000000000000000000000	PEN	15	RPPTO
2926	1	86	13	749.600000000000000000000000000000	PEN	13	RPPTO
2927	1	86	14	749.600000000000000000000000000000	PEN	13	RPPTO
2928	1	86	15	749.600000000000000000000000000000	PEN	13	RPPTO
2929	1	86	16	749.600000000000000000000000000000	PEN	13	RPPTO
2930	1	86	17	749.600000000000000000000000000000	PEN	13	RPPTO
2931	1	86	18	749.600000000000000000000000000000	PEN	13	RPPTO
2932	1	86	19	749.600000000000000000000000000000	PEN	13	RPPTO
2933	1	86	20	749.600000000000000000000000000000	PEN	13	RPPTO
2934	1	86	21	749.600000000000000000000000000000	PEN	13	RPPTO
2935	1	86	22	749.600000000000000000000000000000	PEN	13	RPPTO
2936	1	86	23	749.600000000000000000000000000000	PEN	13	RPPTO
2937	1	86	24	749.600000000000000000000000000000	PEN	13	RPPTO
2938	1	86	13	1672.170000000000000000000000000000	PEN	14	RPPTO
2939	1	86	14	1672.170000000000000000000000000000	PEN	14	RPPTO
2940	1	86	15	1672.170000000000000000000000000000	PEN	14	RPPTO
2941	1	86	16	1672.170000000000000000000000000000	PEN	14	RPPTO
2942	1	86	17	1672.170000000000000000000000000000	PEN	14	RPPTO
2943	1	86	18	1672.170000000000000000000000000000	PEN	14	RPPTO
2944	1	86	19	1672.170000000000000000000000000000	PEN	14	RPPTO
2945	1	86	20	1672.170000000000000000000000000000	PEN	14	RPPTO
2946	1	86	21	1672.170000000000000000000000000000	PEN	14	RPPTO
2947	1	86	22	1672.170000000000000000000000000000	PEN	14	RPPTO
2948	1	86	23	1672.170000000000000000000000000000	PEN	14	RPPTO
2949	1	86	24	1672.170000000000000000000000000000	PEN	14	RPPTO
2950	1	86	13	2883.060000000000000000000000000000	PEN	9	RPPTO
2951	1	86	14	2883.060000000000000000000000000000	PEN	9	RPPTO
2952	1	86	15	2883.060000000000000000000000000000	PEN	9	RPPTO
2953	1	86	16	2883.060000000000000000000000000000	PEN	9	RPPTO
2954	1	86	17	2883.060000000000000000000000000000	PEN	9	RPPTO
2955	1	86	18	2883.060000000000000000000000000000	PEN	9	RPPTO
2956	1	86	19	2883.060000000000000000000000000000	PEN	9	RPPTO
2957	1	86	20	2883.060000000000000000000000000000	PEN	9	RPPTO
2958	1	86	21	2883.060000000000000000000000000000	PEN	9	RPPTO
2959	1	86	22	2883.060000000000000000000000000000	PEN	9	RPPTO
2960	1	86	23	2883.060000000000000000000000000000	PEN	9	RPPTO
2961	1	86	24	2883.060000000000000000000000000000	PEN	9	RPPTO
2962	1	51	13	0.000000000000000000000000000000	PEN	19	RPPTO
2963	1	51	14	0.000000000000000000000000000000	PEN	19	RPPTO
2964	1	51	15	0.000000000000000000000000000000	PEN	19	RPPTO
2965	1	51	16	0.000000000000000000000000000000	PEN	19	RPPTO
2966	1	51	17	0.000000000000000000000000000000	PEN	19	RPPTO
2967	1	51	18	0.000000000000000000000000000000	PEN	19	RPPTO
2968	1	51	19	0.000000000000000000000000000000	PEN	19	RPPTO
2969	1	51	20	90000.000000000000000000000000000000	PEN	19	RPPTO
2970	1	51	21	0.000000000000000000000000000000	PEN	19	RPPTO
2971	1	51	22	0.000000000000000000000000000000	PEN	19	RPPTO
2972	1	51	23	0.000000000000000000000000000000	PEN	19	RPPTO
2973	1	51	24	0.000000000000000000000000000000	PEN	19	RPPTO
2974	1	90	13	371.250000000000000000000000000000	PEN	19	RPPTO
2975	1	90	14	371.250000000000000000000000000000	PEN	19	RPPTO
2976	1	90	15	371.250000000000000000000000000000	PEN	19	RPPTO
2977	1	90	16	371.250000000000000000000000000000	PEN	19	RPPTO
2978	1	90	17	371.250000000000000000000000000000	PEN	19	RPPTO
2979	1	90	18	371.250000000000000000000000000000	PEN	19	RPPTO
2980	1	90	19	371.250000000000000000000000000000	PEN	19	RPPTO
2981	1	90	20	371.250000000000000000000000000000	PEN	19	RPPTO
2982	1	90	21	371.250000000000000000000000000000	PEN	19	RPPTO
2983	1	90	22	371.250000000000000000000000000000	PEN	19	RPPTO
2984	1	90	23	371.250000000000000000000000000000	PEN	19	RPPTO
2985	1	90	24	371.250000000000000000000000000000	PEN	19	RPPTO
2986	1	99	13	0.000000000000000000000000000000	PEN	19	RPPTO
2987	1	99	14	0.000000000000000000000000000000	PEN	19	RPPTO
2988	1	99	15	0.000000000000000000000000000000	PEN	19	RPPTO
2989	1	99	16	0.000000000000000000000000000000	PEN	19	RPPTO
2990	1	99	17	0.000000000000000000000000000000	PEN	19	RPPTO
2991	1	99	18	0.000000000000000000000000000000	PEN	19	RPPTO
2992	1	99	19	0.000000000000000000000000000000	PEN	19	RPPTO
2993	1	99	20	0.000000000000000000000000000000	PEN	19	RPPTO
2994	1	99	21	0.000000000000000000000000000000	PEN	19	RPPTO
2995	1	99	22	187500.000000000000000000000000000000	PEN	19	RPPTO
2996	1	99	23	0.000000000000000000000000000000	PEN	19	RPPTO
2997	1	99	24	0.000000000000000000000000000000	PEN	19	RPPTO
2998	1	87	13	375.000000000000000000000000000000	PEN	19	RPPTO
2999	1	87	14	375.000000000000000000000000000000	PEN	19	RPPTO
3000	1	87	15	375.000000000000000000000000000000	PEN	19	RPPTO
3001	1	87	16	937.500000000000000000000000000000	PEN	19	RPPTO
3002	1	87	17	937.500000000000000000000000000000	PEN	19	RPPTO
3003	1	87	18	937.500000000000000000000000000000	PEN	19	RPPTO
3004	1	87	19	937.500000000000000000000000000000	PEN	19	RPPTO
3005	1	87	20	937.500000000000000000000000000000	PEN	19	RPPTO
3006	1	87	21	937.500000000000000000000000000000	PEN	19	RPPTO
3007	1	87	22	1875.000000000000000000000000000000	PEN	19	RPPTO
3008	1	87	23	1875.000000000000000000000000000000	PEN	19	RPPTO
3009	1	87	24	1875.000000000000000000000000000000	PEN	19	RPPTO
3010	1	63	13	7875.000000000000000000000000000000	PEN	19	RPPTO
3011	1	63	14	7875.000000000000000000000000000000	PEN	19	RPPTO
3012	1	63	15	7875.000000000000000000000000000000	PEN	19	RPPTO
3013	1	63	16	7875.000000000000000000000000000000	PEN	19	RPPTO
3014	1	63	17	7875.000000000000000000000000000000	PEN	19	RPPTO
3015	1	63	18	7875.000000000000000000000000000000	PEN	19	RPPTO
3016	1	63	19	7875.000000000000000000000000000000	PEN	19	RPPTO
3017	1	63	20	7875.000000000000000000000000000000	PEN	19	RPPTO
3018	1	63	21	7875.000000000000000000000000000000	PEN	19	RPPTO
3019	1	63	22	7875.000000000000000000000000000000	PEN	19	RPPTO
3020	1	63	23	7875.000000000000000000000000000000	PEN	19	RPPTO
3021	1	63	24	7875.000000000000000000000000000000	PEN	19	RPPTO
3022	1	30	13	14437.500000000000000000000000000000	PEN	19	RPPTO
3023	1	30	14	14437.500000000000000000000000000000	PEN	19	RPPTO
3024	1	30	15	14437.500000000000000000000000000000	PEN	19	RPPTO
3025	1	30	16	14437.500000000000000000000000000000	PEN	19	RPPTO
3026	1	30	17	14437.500000000000000000000000000000	PEN	19	RPPTO
3027	1	30	18	14437.500000000000000000000000000000	PEN	19	RPPTO
3028	1	30	19	14437.500000000000000000000000000000	PEN	19	RPPTO
3029	1	30	20	14437.500000000000000000000000000000	PEN	19	RPPTO
3030	1	30	21	14437.500000000000000000000000000000	PEN	19	RPPTO
3031	1	30	22	14437.500000000000000000000000000000	PEN	19	RPPTO
3032	1	30	23	14437.500000000000000000000000000000	PEN	19	RPPTO
3033	1	30	24	14437.500000000000000000000000000000	PEN	19	RPPTO
3034	1	64	13	71.250000000000000000000000000000	PEN	19	RPPTO
3035	1	64	14	71.250000000000000000000000000000	PEN	19	RPPTO
3036	1	64	15	71.250000000000000000000000000000	PEN	19	RPPTO
3037	1	64	16	71.250000000000000000000000000000	PEN	19	RPPTO
3038	1	64	17	71.250000000000000000000000000000	PEN	19	RPPTO
3039	1	64	18	71.250000000000000000000000000000	PEN	19	RPPTO
3040	1	64	19	71.250000000000000000000000000000	PEN	19	RPPTO
3041	1	64	20	71.250000000000000000000000000000	PEN	19	RPPTO
3042	1	64	21	71.250000000000000000000000000000	PEN	19	RPPTO
3043	1	64	22	71.250000000000000000000000000000	PEN	19	RPPTO
3044	1	64	23	71.250000000000000000000000000000	PEN	19	RPPTO
3045	1	64	24	71.250000000000000000000000000000	PEN	19	RPPTO
3046	1	65	13	0.000000000000000000000000000000	PEN	19	RPPTO
3047	1	65	14	0.000000000000000000000000000000	PEN	19	RPPTO
3048	1	65	15	0.000000000000000000000000000000	PEN	19	RPPTO
3049	1	65	16	19500.000000000000000000000000000000	PEN	19	RPPTO
3050	1	65	17	0.000000000000000000000000000000	PEN	19	RPPTO
3051	1	65	18	0.000000000000000000000000000000	PEN	19	RPPTO
3052	1	65	19	0.000000000000000000000000000000	PEN	19	RPPTO
3053	1	65	20	0.000000000000000000000000000000	PEN	19	RPPTO
3054	1	65	21	0.000000000000000000000000000000	PEN	19	RPPTO
3055	1	65	22	0.000000000000000000000000000000	PEN	19	RPPTO
3056	1	65	23	0.000000000000000000000000000000	PEN	19	RPPTO
3057	1	65	24	0.000000000000000000000000000000	PEN	19	RPPTO
3058	1	50	13	937.500000000000000000000000000000	PEN	19	RPPTO
3059	1	50	14	4687.500000000000000000000000000000	PEN	19	RPPTO
3060	1	50	15	937.500000000000000000000000000000	PEN	19	RPPTO
3061	1	50	16	1875.000000000000000000000000000000	PEN	19	RPPTO
3062	1	50	17	1875.000000000000000000000000000000	PEN	19	RPPTO
3063	1	50	18	1875.000000000000000000000000000000	PEN	19	RPPTO
3064	1	50	19	1875.000000000000000000000000000000	PEN	19	RPPTO
3065	1	50	20	1875.000000000000000000000000000000	PEN	19	RPPTO
3066	1	50	21	1875.000000000000000000000000000000	PEN	19	RPPTO
3067	1	50	22	2812.500000000000000000000000000000	PEN	19	RPPTO
3068	1	50	23	2812.500000000000000000000000000000	PEN	19	RPPTO
3069	1	50	24	2812.500000000000000000000000000000	PEN	19	RPPTO
3070	1	61	13	0.000000000000000000000000000000	PEN	19	RPPTO
3071	1	61	14	0.000000000000000000000000000000	PEN	19	RPPTO
3072	1	61	15	0.000000000000000000000000000000	PEN	19	RPPTO
3073	1	61	16	0.000000000000000000000000000000	PEN	19	RPPTO
3074	1	61	17	0.000000000000000000000000000000	PEN	19	RPPTO
3075	1	61	18	0.000000000000000000000000000000	PEN	19	RPPTO
3076	1	61	19	0.000000000000000000000000000000	PEN	19	RPPTO
3077	1	61	20	371.250000000000000000000000000000	PEN	19	RPPTO
3078	1	61	21	0.000000000000000000000000000000	PEN	19	RPPTO
3079	1	61	22	0.000000000000000000000000000000	PEN	19	RPPTO
3080	1	61	23	0.000000000000000000000000000000	PEN	19	RPPTO
3081	1	61	24	0.000000000000000000000000000000	PEN	19	RPPTO
3082	1	76	13	0.000000000000000000000000000000	PEN	19	RPPTO
3083	1	76	14	0.000000000000000000000000000000	PEN	19	RPPTO
3084	1	76	15	0.000000000000000000000000000000	PEN	19	RPPTO
3085	1	76	16	0.000000000000000000000000000000	PEN	19	RPPTO
3086	1	76	17	0.000000000000000000000000000000	PEN	19	RPPTO
3087	1	76	18	0.000000000000000000000000000000	PEN	19	RPPTO
3088	1	76	19	0.000000000000000000000000000000	PEN	19	RPPTO
3089	1	76	20	0.000000000000000000000000000000	PEN	19	RPPTO
3090	1	76	21	0.000000000000000000000000000000	PEN	19	RPPTO
3091	1	76	22	0.000000000000000000000000000000	PEN	19	RPPTO
3092	1	76	23	0.000000000000000000000000000000	PEN	19	RPPTO
3093	1	76	24	10312.500000000000000000000000000000	PEN	19	RPPTO
3094	1	100	13	74062.500000000000000000000000000000	PEN	19	RPPTO
3095	1	100	14	74062.500000000000000000000000000000	PEN	19	RPPTO
3096	1	100	15	74062.500000000000000000000000000000	PEN	19	RPPTO
3097	1	100	16	74062.500000000000000000000000000000	PEN	19	RPPTO
3098	1	100	17	74062.500000000000000000000000000000	PEN	19	RPPTO
3099	1	100	18	74062.500000000000000000000000000000	PEN	19	RPPTO
3100	1	100	19	74062.500000000000000000000000000000	PEN	19	RPPTO
3101	1	100	20	74062.500000000000000000000000000000	PEN	19	RPPTO
3102	1	100	21	74062.500000000000000000000000000000	PEN	19	RPPTO
3103	1	100	22	74062.500000000000000000000000000000	PEN	19	RPPTO
3104	1	100	23	74062.500000000000000000000000000000	PEN	19	RPPTO
3105	1	100	24	74062.500000000000000000000000000000	PEN	19	RPPTO
3106	1	102	13	1350.000000000000000000000000000000	PEN	19	RPPTO
3107	1	102	14	1350.000000000000000000000000000000	PEN	19	RPPTO
3108	1	102	15	1350.000000000000000000000000000000	PEN	19	RPPTO
3109	1	102	16	1350.000000000000000000000000000000	PEN	19	RPPTO
3110	1	102	17	1350.000000000000000000000000000000	PEN	19	RPPTO
3111	1	102	18	1350.000000000000000000000000000000	PEN	19	RPPTO
3112	1	102	19	1350.000000000000000000000000000000	PEN	19	RPPTO
3113	1	102	20	1350.000000000000000000000000000000	PEN	19	RPPTO
3114	1	102	21	1350.000000000000000000000000000000	PEN	19	RPPTO
3115	1	102	22	1350.000000000000000000000000000000	PEN	19	RPPTO
3116	1	102	23	1350.000000000000000000000000000000	PEN	19	RPPTO
3117	1	102	24	1350.000000000000000000000000000000	PEN	19	RPPTO
3118	1	107	13	0.000000000000000000000000000000	PEN	19	RPPTO
3119	1	107	14	0.000000000000000000000000000000	PEN	19	RPPTO
3120	1	107	15	5625.000000000000000000000000000000	PEN	19	RPPTO
3121	1	107	16	0.000000000000000000000000000000	PEN	19	RPPTO
3122	1	107	17	0.000000000000000000000000000000	PEN	19	RPPTO
3123	1	107	18	5625.000000000000000000000000000000	PEN	19	RPPTO
3124	1	107	19	0.000000000000000000000000000000	PEN	19	RPPTO
3125	1	107	20	0.000000000000000000000000000000	PEN	19	RPPTO
3126	1	107	21	5625.000000000000000000000000000000	PEN	19	RPPTO
3127	1	107	22	0.000000000000000000000000000000	PEN	19	RPPTO
3128	1	107	23	0.000000000000000000000000000000	PEN	19	RPPTO
3129	1	107	24	5625.000000000000000000000000000000	PEN	19	RPPTO
3130	1	28	13	1875.000000000000000000000000000000	PEN	19	RPPTO
3131	1	28	14	1875.000000000000000000000000000000	PEN	19	RPPTO
3132	1	28	15	1875.000000000000000000000000000000	PEN	19	RPPTO
3133	1	28	16	1875.000000000000000000000000000000	PEN	19	RPPTO
3134	1	28	17	1875.000000000000000000000000000000	PEN	19	RPPTO
3135	1	28	18	1875.000000000000000000000000000000	PEN	19	RPPTO
3136	1	28	19	1875.000000000000000000000000000000	PEN	19	RPPTO
3137	1	28	20	1875.000000000000000000000000000000	PEN	19	RPPTO
3138	1	28	21	1875.000000000000000000000000000000	PEN	19	RPPTO
3139	1	28	22	1875.000000000000000000000000000000	PEN	19	RPPTO
3140	1	28	23	1875.000000000000000000000000000000	PEN	19	RPPTO
3141	1	28	24	1875.000000000000000000000000000000	PEN	19	RPPTO
3142	1	31	13	2300.000000000000000000000000000000	PEN	19	RPPTO
3143	1	31	14	0.000000000000000000000000000000	PEN	19	RPPTO
3144	1	31	15	2300.000000000000000000000000000000	PEN	19	RPPTO
3145	1	31	16	0.000000000000000000000000000000	PEN	19	RPPTO
3146	1	31	17	2300.000000000000000000000000000000	PEN	19	RPPTO
3147	1	31	18	550.000000000000000000000000000000	PEN	19	RPPTO
3148	1	31	19	0.000000000000000000000000000000	PEN	19	RPPTO
3149	1	31	20	2300.000000000000000000000000000000	PEN	19	RPPTO
3150	1	31	21	6900.000000000000000000000000000000	PEN	19	RPPTO
3151	1	31	22	2300.000000000000000000000000000000	PEN	19	RPPTO
3152	1	31	23	0.000000000000000000000000000000	PEN	19	RPPTO
3153	1	31	24	2300.000000000000000000000000000000	PEN	19	RPPTO
3154	1	58	13	0.000000000000000000000000000000	PEN	19	RPPTO
3155	1	58	14	0.000000000000000000000000000000	PEN	19	RPPTO
3156	1	58	15	225000.000000000000000000000000000000	PEN	19	RPPTO
3157	1	58	16	0.000000000000000000000000000000	PEN	19	RPPTO
3158	1	58	17	0.000000000000000000000000000000	PEN	19	RPPTO
3159	1	58	18	0.000000000000000000000000000000	PEN	19	RPPTO
3160	1	58	19	0.000000000000000000000000000000	PEN	19	RPPTO
3161	1	58	20	0.000000000000000000000000000000	PEN	19	RPPTO
3162	1	58	21	0.000000000000000000000000000000	PEN	19	RPPTO
3163	1	58	22	0.000000000000000000000000000000	PEN	19	RPPTO
3164	1	58	23	0.000000000000000000000000000000	PEN	19	RPPTO
3165	1	58	24	0.000000000000000000000000000000	PEN	19	RPPTO
3166	1	74	13	250.000000000000000000000000000000	PEN	19	RPPTO
3167	1	74	14	250.000000000000000000000000000000	PEN	19	RPPTO
3168	1	74	15	250.000000000000000000000000000000	PEN	19	RPPTO
3169	1	74	16	250.000000000000000000000000000000	PEN	19	RPPTO
3170	1	74	17	250.000000000000000000000000000000	PEN	19	RPPTO
3171	1	74	18	250.000000000000000000000000000000	PEN	19	RPPTO
3172	1	74	19	250.000000000000000000000000000000	PEN	19	RPPTO
3173	1	74	20	250.000000000000000000000000000000	PEN	19	RPPTO
3174	1	74	21	250.000000000000000000000000000000	PEN	19	RPPTO
3175	1	74	22	250.000000000000000000000000000000	PEN	19	RPPTO
3176	1	74	23	250.000000000000000000000000000000	PEN	19	RPPTO
3177	1	74	24	250.000000000000000000000000000000	PEN	19	RPPTO
3178	1	20	13	0.000000000000000000000000000000	PEN	19	RPPTO
3179	1	20	14	0.000000000000000000000000000000	PEN	19	RPPTO
3180	1	20	15	0.000000000000000000000000000000	PEN	19	RPPTO
3181	1	20	16	31875.000000000000000000000000000000	PEN	19	RPPTO
3182	1	20	17	0.000000000000000000000000000000	PEN	19	RPPTO
3183	1	20	18	0.000000000000000000000000000000	PEN	19	RPPTO
3184	1	20	19	0.000000000000000000000000000000	PEN	19	RPPTO
3185	1	20	20	0.000000000000000000000000000000	PEN	19	RPPTO
3186	1	20	21	0.000000000000000000000000000000	PEN	19	RPPTO
3187	1	20	22	0.000000000000000000000000000000	PEN	19	RPPTO
3188	1	20	23	0.000000000000000000000000000000	PEN	19	RPPTO
3189	1	20	24	0.000000000000000000000000000000	PEN	19	RPPTO
3190	1	32	13	2000.000000000000000000000000000000	PEN	19	RPPTO
3191	1	32	14	2000.000000000000000000000000000000	PEN	19	RPPTO
3192	1	32	15	2000.000000000000000000000000000000	PEN	19	RPPTO
3193	1	32	16	2000.000000000000000000000000000000	PEN	19	RPPTO
3194	1	32	17	2000.000000000000000000000000000000	PEN	19	RPPTO
3195	1	32	18	2000.000000000000000000000000000000	PEN	19	RPPTO
3196	1	32	19	2000.000000000000000000000000000000	PEN	19	RPPTO
3197	1	32	20	2000.000000000000000000000000000000	PEN	19	RPPTO
3198	1	32	21	2000.000000000000000000000000000000	PEN	19	RPPTO
3199	1	32	22	2000.000000000000000000000000000000	PEN	19	RPPTO
3200	1	32	23	2000.000000000000000000000000000000	PEN	19	RPPTO
3201	1	32	24	2000.000000000000000000000000000000	PEN	19	RPPTO
3202	1	33	13	0.000000000000000000000000000000	PEN	19	RPPTO
3203	1	33	14	0.000000000000000000000000000000	PEN	19	RPPTO
3204	1	33	15	0.000000000000000000000000000000	PEN	19	RPPTO
3205	1	33	16	0.000000000000000000000000000000	PEN	19	RPPTO
3206	1	33	17	0.000000000000000000000000000000	PEN	19	RPPTO
3207	1	33	18	0.000000000000000000000000000000	PEN	19	RPPTO
3208	1	33	19	12600.000000000000000000000000000000	PEN	19	RPPTO
3209	1	33	20	0.000000000000000000000000000000	PEN	19	RPPTO
3210	1	33	21	0.000000000000000000000000000000	PEN	19	RPPTO
3211	1	33	22	0.000000000000000000000000000000	PEN	19	RPPTO
3212	1	33	23	0.000000000000000000000000000000	PEN	19	RPPTO
3213	1	33	24	0.000000000000000000000000000000	PEN	19	RPPTO
3214	1	52	13	2475.000000000000000000000000000000	PEN	19	RPPTO
3215	1	52	14	2475.000000000000000000000000000000	PEN	19	RPPTO
3216	1	52	15	2475.000000000000000000000000000000	PEN	19	RPPTO
3217	1	52	16	2475.000000000000000000000000000000	PEN	19	RPPTO
3218	1	52	17	2475.000000000000000000000000000000	PEN	19	RPPTO
3219	1	52	18	2475.000000000000000000000000000000	PEN	19	RPPTO
3220	1	52	19	2475.000000000000000000000000000000	PEN	19	RPPTO
3221	1	52	20	2475.000000000000000000000000000000	PEN	19	RPPTO
3222	1	52	21	2475.000000000000000000000000000000	PEN	19	RPPTO
3223	1	52	22	2475.000000000000000000000000000000	PEN	19	RPPTO
3224	1	52	23	2475.000000000000000000000000000000	PEN	19	RPPTO
3225	1	52	24	2475.000000000000000000000000000000	PEN	19	RPPTO
3226	1	101	13	0.000000000000000000000000000000	PEN	19	RPPTO
3227	1	101	14	0.000000000000000000000000000000	PEN	19	RPPTO
3228	1	101	15	1875.000000000000000000000000000000	PEN	19	RPPTO
3229	1	101	16	0.000000000000000000000000000000	PEN	19	RPPTO
3230	1	101	17	0.000000000000000000000000000000	PEN	19	RPPTO
3231	1	101	18	1875.000000000000000000000000000000	PEN	19	RPPTO
3232	1	101	19	0.000000000000000000000000000000	PEN	19	RPPTO
3233	1	101	20	0.000000000000000000000000000000	PEN	19	RPPTO
3234	1	101	21	1875.000000000000000000000000000000	PEN	19	RPPTO
3235	1	101	22	0.000000000000000000000000000000	PEN	19	RPPTO
3236	1	101	23	0.000000000000000000000000000000	PEN	19	RPPTO
3237	1	101	24	1875.000000000000000000000000000000	PEN	19	RPPTO
3238	1	103	13	0.000000000000000000000000000000	PEN	19	RPPTO
3239	1	103	14	0.000000000000000000000000000000	PEN	19	RPPTO
3240	1	103	15	1125.000000000000000000000000000000	PEN	19	RPPTO
3241	1	103	16	0.000000000000000000000000000000	PEN	19	RPPTO
3242	1	103	17	0.000000000000000000000000000000	PEN	19	RPPTO
3243	1	103	18	1125.000000000000000000000000000000	PEN	19	RPPTO
3244	1	103	19	0.000000000000000000000000000000	PEN	19	RPPTO
3245	1	103	20	0.000000000000000000000000000000	PEN	19	RPPTO
3246	1	103	21	1125.000000000000000000000000000000	PEN	19	RPPTO
3247	1	103	22	0.000000000000000000000000000000	PEN	19	RPPTO
3248	1	103	23	0.000000000000000000000000000000	PEN	19	RPPTO
3249	1	103	24	1125.000000000000000000000000000000	PEN	19	RPPTO
3250	1	27	13	0.000000000000000000000000000000	PEN	19	RPPTO
3251	1	27	14	0.000000000000000000000000000000	PEN	19	RPPTO
3252	1	27	15	0.000000000000000000000000000000	PEN	19	RPPTO
3253	1	27	16	0.000000000000000000000000000000	PEN	19	RPPTO
3254	1	27	17	6000.000000000000000000000000000000	PEN	19	RPPTO
3255	1	27	18	0.000000000000000000000000000000	PEN	19	RPPTO
3256	1	27	19	0.000000000000000000000000000000	PEN	19	RPPTO
3257	1	27	20	6750.000000000000000000000000000000	PEN	19	RPPTO
3258	1	27	21	0.000000000000000000000000000000	PEN	19	RPPTO
3259	1	27	22	0.000000000000000000000000000000	PEN	19	RPPTO
3260	1	27	23	0.000000000000000000000000000000	PEN	19	RPPTO
3261	1	27	24	0.000000000000000000000000000000	PEN	19	RPPTO
3262	1	36	13	0.000000000000000000000000000000	PEN	19	RPPTO
3263	1	36	14	0.000000000000000000000000000000	PEN	19	RPPTO
3264	1	36	15	0.000000000000000000000000000000	PEN	19	RPPTO
3265	1	36	16	720.000000000000000000000000000000	PEN	19	RPPTO
3266	1	36	17	0.000000000000000000000000000000	PEN	19	RPPTO
3267	1	36	18	0.000000000000000000000000000000	PEN	19	RPPTO
3268	1	36	19	0.000000000000000000000000000000	PEN	19	RPPTO
3269	1	36	20	0.000000000000000000000000000000	PEN	19	RPPTO
3270	1	36	21	0.000000000000000000000000000000	PEN	19	RPPTO
3271	1	36	22	0.000000000000000000000000000000	PEN	19	RPPTO
3272	1	36	23	0.000000000000000000000000000000	PEN	19	RPPTO
3273	1	36	24	0.000000000000000000000000000000	PEN	19	RPPTO
3274	1	48	13	187.500000000000000000000000000000	PEN	19	RPPTO
3275	1	48	14	187.500000000000000000000000000000	PEN	19	RPPTO
3276	1	48	15	187.500000000000000000000000000000	PEN	19	RPPTO
3277	1	48	16	187.500000000000000000000000000000	PEN	19	RPPTO
3278	1	48	17	187.500000000000000000000000000000	PEN	19	RPPTO
3279	1	48	18	187.500000000000000000000000000000	PEN	19	RPPTO
3280	1	48	19	187.500000000000000000000000000000	PEN	19	RPPTO
3281	1	48	20	187.500000000000000000000000000000	PEN	19	RPPTO
3282	1	48	21	187.500000000000000000000000000000	PEN	19	RPPTO
3283	1	48	22	187.500000000000000000000000000000	PEN	19	RPPTO
3284	1	48	23	187.500000000000000000000000000000	PEN	19	RPPTO
3285	1	48	24	187.500000000000000000000000000000	PEN	19	RPPTO
3286	1	77	13	0.000000000000000000000000000000	PEN	20	RPPTO
3287	1	77	14	0.000000000000000000000000000000	PEN	20	RPPTO
3288	1	77	15	0.000000000000000000000000000000	PEN	20	RPPTO
3289	1	77	16	0.000000000000000000000000000000	PEN	20	RPPTO
3290	1	77	17	0.000000000000000000000000000000	PEN	20	RPPTO
3291	1	77	18	0.000000000000000000000000000000	PEN	20	RPPTO
3292	1	77	19	0.000000000000000000000000000000	PEN	20	RPPTO
3293	1	77	20	25575.000000000000000000000000000000	PEN	20	RPPTO
3294	1	77	21	0.000000000000000000000000000000	PEN	20	RPPTO
3295	1	77	22	0.000000000000000000000000000000	PEN	20	RPPTO
3296	1	77	23	0.000000000000000000000000000000	PEN	20	RPPTO
3297	1	77	24	0.000000000000000000000000000000	PEN	20	RPPTO
3298	1	70	13	5250.000000000000000000000000000000	PEN	20	RPPTO
3299	1	70	14	5250.000000000000000000000000000000	PEN	20	RPPTO
3300	1	70	15	5250.000000000000000000000000000000	PEN	20	RPPTO
3301	1	70	16	5250.000000000000000000000000000000	PEN	20	RPPTO
3302	1	70	17	5250.000000000000000000000000000000	PEN	20	RPPTO
3303	1	70	18	5250.000000000000000000000000000000	PEN	20	RPPTO
3304	1	70	19	5250.000000000000000000000000000000	PEN	20	RPPTO
3305	1	70	20	5250.000000000000000000000000000000	PEN	20	RPPTO
3306	1	70	21	5250.000000000000000000000000000000	PEN	20	RPPTO
3307	1	70	22	5250.000000000000000000000000000000	PEN	20	RPPTO
3308	1	70	23	5250.000000000000000000000000000000	PEN	20	RPPTO
3309	1	70	24	5250.000000000000000000000000000000	PEN	20	RPPTO
3310	1	108	13	94875.000000000000000000000000000000	PEN	20	RPPTO
3311	1	108	14	0.000000000000000000000000000000	PEN	20	RPPTO
3312	1	108	15	0.000000000000000000000000000000	PEN	20	RPPTO
3313	1	108	16	0.000000000000000000000000000000	PEN	20	RPPTO
3314	1	108	17	0.000000000000000000000000000000	PEN	20	RPPTO
3315	1	108	18	0.000000000000000000000000000000	PEN	20	RPPTO
3316	1	108	19	0.000000000000000000000000000000	PEN	20	RPPTO
3317	1	108	20	0.000000000000000000000000000000	PEN	20	RPPTO
3318	1	108	21	0.000000000000000000000000000000	PEN	20	RPPTO
3319	1	108	22	0.000000000000000000000000000000	PEN	20	RPPTO
3320	1	108	23	0.000000000000000000000000000000	PEN	20	RPPTO
3321	1	108	24	0.000000000000000000000000000000	PEN	20	RPPTO
3322	1	62	13	0.000000000000000000000000000000	PEN	20	RPPTO
3323	1	62	14	0.000000000000000000000000000000	PEN	20	RPPTO
3324	1	62	15	1875.000000000000000000000000000000	PEN	20	RPPTO
3325	1	62	16	0.000000000000000000000000000000	PEN	20	RPPTO
3326	1	62	17	0.000000000000000000000000000000	PEN	20	RPPTO
3327	1	62	18	0.000000000000000000000000000000	PEN	20	RPPTO
3328	1	62	19	0.000000000000000000000000000000	PEN	20	RPPTO
3329	1	62	20	0.000000000000000000000000000000	PEN	20	RPPTO
3330	1	62	21	0.000000000000000000000000000000	PEN	20	RPPTO
3331	1	62	22	0.000000000000000000000000000000	PEN	20	RPPTO
3332	1	62	23	0.000000000000000000000000000000	PEN	20	RPPTO
3333	1	62	24	0.000000000000000000000000000000	PEN	20	RPPTO
3334	1	111	13	11250.000000000000000000000000000000	PEN	26	RPPTO
3335	1	111	14	11250.000000000000000000000000000000	PEN	26	RPPTO
3336	1	111	15	11250.000000000000000000000000000000	PEN	26	RPPTO
3337	1	111	16	11250.000000000000000000000000000000	PEN	26	RPPTO
3338	1	111	17	11250.000000000000000000000000000000	PEN	26	RPPTO
3339	1	111	18	11250.000000000000000000000000000000	PEN	26	RPPTO
3340	1	111	19	11250.000000000000000000000000000000	PEN	26	RPPTO
3341	1	111	20	11250.000000000000000000000000000000	PEN	26	RPPTO
3342	1	111	21	11250.000000000000000000000000000000	PEN	26	RPPTO
3343	1	111	22	11250.000000000000000000000000000000	PEN	26	RPPTO
3344	1	111	23	11250.000000000000000000000000000000	PEN	26	RPPTO
3345	1	111	24	11250.000000000000000000000000000000	PEN	26	RPPTO
3346	1	69	13	15000.000000000000000000000000000000	PEN	27	RPPTO
3347	1	69	14	15000.000000000000000000000000000000	PEN	27	RPPTO
3348	1	69	15	15000.000000000000000000000000000000	PEN	27	RPPTO
3349	1	69	16	15000.000000000000000000000000000000	PEN	27	RPPTO
3350	1	69	17	15000.000000000000000000000000000000	PEN	27	RPPTO
3351	1	69	18	15000.000000000000000000000000000000	PEN	27	RPPTO
3352	1	69	19	15000.000000000000000000000000000000	PEN	27	RPPTO
3353	1	69	20	15000.000000000000000000000000000000	PEN	27	RPPTO
3354	1	69	21	15000.000000000000000000000000000000	PEN	27	RPPTO
3355	1	69	22	15000.000000000000000000000000000000	PEN	27	RPPTO
3356	1	69	23	15000.000000000000000000000000000000	PEN	27	RPPTO
3357	1	69	24	15000.000000000000000000000000000000	PEN	27	RPPTO
3358	1	92	13	3750.000000000000000000000000000000	PEN	8	RPPTO
3359	1	92	14	3750.000000000000000000000000000000	PEN	8	RPPTO
3360	1	92	15	3750.000000000000000000000000000000	PEN	8	RPPTO
3361	1	92	16	3750.000000000000000000000000000000	PEN	8	RPPTO
3362	1	92	17	3750.000000000000000000000000000000	PEN	8	RPPTO
3363	1	92	18	3750.000000000000000000000000000000	PEN	8	RPPTO
3364	1	92	19	3750.000000000000000000000000000000	PEN	8	RPPTO
3365	1	92	20	3750.000000000000000000000000000000	PEN	8	RPPTO
3366	1	92	21	3750.000000000000000000000000000000	PEN	8	RPPTO
3367	1	92	22	3750.000000000000000000000000000000	PEN	8	RPPTO
3368	1	92	23	3750.000000000000000000000000000000	PEN	8	RPPTO
3369	1	92	24	3750.000000000000000000000000000000	PEN	8	RPPTO
3370	1	78	13	28125.000000000000000000000000000000	PEN	28	RPPTO
3371	1	78	14	0.000000000000000000000000000000	PEN	28	RPPTO
3372	1	78	15	39375.000000000000000000000000000000	PEN	28	RPPTO
3373	1	78	16	28125.000000000000000000000000000000	PEN	28	RPPTO
3374	1	78	17	0.000000000000000000000000000000	PEN	28	RPPTO
3375	1	78	18	39375.000000000000000000000000000000	PEN	28	RPPTO
3376	1	78	19	28125.000000000000000000000000000000	PEN	28	RPPTO
3377	1	78	20	0.000000000000000000000000000000	PEN	28	RPPTO
3378	1	78	21	39375.000000000000000000000000000000	PEN	28	RPPTO
3379	1	78	22	28125.000000000000000000000000000000	PEN	28	RPPTO
3380	1	78	23	0.000000000000000000000000000000	PEN	28	RPPTO
3381	1	78	24	39375.000000000000000000000000000000	PEN	28	RPPTO
3382	1	25	13	0.000000000000000000000000000000	PEN	28	RPPTO
3383	1	25	14	0.000000000000000000000000000000	PEN	28	RPPTO
3384	1	25	15	0.000000000000000000000000000000	PEN	28	RPPTO
3385	1	25	16	0.000000000000000000000000000000	PEN	28	RPPTO
3386	1	25	17	0.000000000000000000000000000000	PEN	28	RPPTO
3387	1	25	18	0.000000000000000000000000000000	PEN	28	RPPTO
3388	1	25	19	0.000000000000000000000000000000	PEN	28	RPPTO
3389	1	25	20	0.000000000000000000000000000000	PEN	28	RPPTO
3390	1	25	21	93750.000000000000000000000000000000	PEN	28	RPPTO
3391	1	25	22	0.000000000000000000000000000000	PEN	28	RPPTO
3392	1	25	23	0.000000000000000000000000000000	PEN	28	RPPTO
3393	1	25	24	0.000000000000000000000000000000	PEN	28	RPPTO
3394	1	68	13	0.000000000000000000000000000000	PEN	28	RPPTO
3395	1	68	14	101250.000000000000000000000000000000	PEN	28	RPPTO
3396	1	68	15	0.000000000000000000000000000000	PEN	28	RPPTO
3397	1	68	16	0.000000000000000000000000000000	PEN	28	RPPTO
3398	1	68	17	101250.000000000000000000000000000000	PEN	28	RPPTO
3399	1	68	18	0.000000000000000000000000000000	PEN	28	RPPTO
3400	1	68	19	0.000000000000000000000000000000	PEN	28	RPPTO
3401	1	68	20	101250.000000000000000000000000000000	PEN	28	RPPTO
3402	1	68	21	0.000000000000000000000000000000	PEN	28	RPPTO
3403	1	68	22	0.000000000000000000000000000000	PEN	28	RPPTO
3404	1	68	23	101250.000000000000000000000000000000	PEN	28	RPPTO
3405	1	68	24	0.000000000000000000000000000000	PEN	28	RPPTO
3406	1	98	13	5000.000000000000000000000000000000	PEN	28	RPPTO
3407	1	98	14	5000.000000000000000000000000000000	PEN	28	RPPTO
3408	1	98	15	5000.000000000000000000000000000000	PEN	28	RPPTO
3409	1	98	16	5000.000000000000000000000000000000	PEN	28	RPPTO
3410	1	98	17	5000.000000000000000000000000000000	PEN	28	RPPTO
3411	1	98	18	5000.000000000000000000000000000000	PEN	28	RPPTO
3412	1	98	19	5000.000000000000000000000000000000	PEN	28	RPPTO
3413	1	98	20	5000.000000000000000000000000000000	PEN	28	RPPTO
3414	1	98	21	5000.000000000000000000000000000000	PEN	28	RPPTO
3415	1	98	22	5000.000000000000000000000000000000	PEN	28	RPPTO
3416	1	98	23	5000.000000000000000000000000000000	PEN	28	RPPTO
3417	1	98	24	5000.000000000000000000000000000000	PEN	28	RPPTO
3418	1	83	13	0.000000000000000000000000000000	PEN	28	RPPTO
3419	1	83	14	0.000000000000000000000000000000	PEN	28	RPPTO
3420	1	83	15	31875.000000000000000000000000000000	PEN	28	RPPTO
3421	1	83	16	0.000000000000000000000000000000	PEN	28	RPPTO
3422	1	83	17	0.000000000000000000000000000000	PEN	28	RPPTO
3423	1	83	18	0.000000000000000000000000000000	PEN	28	RPPTO
3424	1	83	19	0.000000000000000000000000000000	PEN	28	RPPTO
3425	1	83	20	0.000000000000000000000000000000	PEN	28	RPPTO
3426	1	83	21	0.000000000000000000000000000000	PEN	28	RPPTO
3427	1	83	22	0.000000000000000000000000000000	PEN	28	RPPTO
3428	1	83	23	0.000000000000000000000000000000	PEN	28	RPPTO
3429	1	83	24	0.000000000000000000000000000000	PEN	28	RPPTO
3430	1	71	13	0.000000000000000000000000000000	PEN	24	RPPTO
3431	1	71	14	68625.000000000000000000000000000000	PEN	24	RPPTO
3432	1	71	15	0.000000000000000000000000000000	PEN	24	RPPTO
3433	1	71	16	0.000000000000000000000000000000	PEN	24	RPPTO
3434	1	71	17	0.000000000000000000000000000000	PEN	24	RPPTO
3435	1	71	18	0.000000000000000000000000000000	PEN	24	RPPTO
3436	1	71	19	0.000000000000000000000000000000	PEN	24	RPPTO
3437	1	71	20	0.000000000000000000000000000000	PEN	24	RPPTO
3438	1	71	21	0.000000000000000000000000000000	PEN	24	RPPTO
3439	1	71	22	0.000000000000000000000000000000	PEN	24	RPPTO
3440	1	71	23	0.000000000000000000000000000000	PEN	24	RPPTO
3441	1	71	24	0.000000000000000000000000000000	PEN	24	RPPTO
3442	1	109	13	5625.000000000000000000000000000000	PEN	24	RPPTO
3443	1	109	14	5625.000000000000000000000000000000	PEN	24	RPPTO
3444	1	109	15	5625.000000000000000000000000000000	PEN	24	RPPTO
3445	1	109	16	5625.000000000000000000000000000000	PEN	24	RPPTO
3446	1	109	17	5625.000000000000000000000000000000	PEN	24	RPPTO
3447	1	109	18	5625.000000000000000000000000000000	PEN	24	RPPTO
3448	1	109	19	5625.000000000000000000000000000000	PEN	24	RPPTO
3449	1	109	20	5625.000000000000000000000000000000	PEN	24	RPPTO
3450	1	109	21	5625.000000000000000000000000000000	PEN	24	RPPTO
3451	1	109	22	5625.000000000000000000000000000000	PEN	24	RPPTO
3452	1	109	23	5625.000000000000000000000000000000	PEN	24	RPPTO
3453	1	109	24	5625.000000000000000000000000000000	PEN	24	RPPTO
3454	1	113	13	11250.000000000000000000000000000000	PEN	28	RPPTO
3455	1	113	14	0.000000000000000000000000000000	PEN	28	RPPTO
3456	1	113	15	0.000000000000000000000000000000	PEN	28	RPPTO
3457	1	113	16	11250.000000000000000000000000000000	PEN	28	RPPTO
3458	1	113	17	0.000000000000000000000000000000	PEN	28	RPPTO
3459	1	113	18	0.000000000000000000000000000000	PEN	28	RPPTO
3460	1	113	19	11250.000000000000000000000000000000	PEN	28	RPPTO
3461	1	113	20	0.000000000000000000000000000000	PEN	28	RPPTO
3462	1	113	21	0.000000000000000000000000000000	PEN	28	RPPTO
3463	1	113	22	11250.000000000000000000000000000000	PEN	28	RPPTO
3464	1	113	23	0.000000000000000000000000000000	PEN	28	RPPTO
3465	1	113	24	0.000000000000000000000000000000	PEN	28	RPPTO
3466	1	79	13	0.000000000000000000000000000000	PEN	16	RPPTO
3467	1	79	14	0.000000000000000000000000000000	PEN	16	RPPTO
3468	1	79	15	0.000000000000000000000000000000	PEN	16	RPPTO
3469	1	79	16	0.000000000000000000000000000000	PEN	16	RPPTO
3470	1	79	17	0.000000000000000000000000000000	PEN	16	RPPTO
3471	1	79	18	0.000000000000000000000000000000	PEN	16	RPPTO
3472	1	79	19	0.000000000000000000000000000000	PEN	16	RPPTO
3473	1	79	20	0.000000000000000000000000000000	PEN	16	RPPTO
3474	1	79	21	396412.500000000000000000000000000000	PEN	16	RPPTO
3475	1	79	22	0.000000000000000000000000000000	PEN	16	RPPTO
3476	1	79	23	0.000000000000000000000000000000	PEN	16	RPPTO
3477	1	79	24	0.000000000000000000000000000000	PEN	16	RPPTO
3478	1	80	13	0.000000000000000000000000000000	PEN	25	RPPTO
3479	1	80	14	0.000000000000000000000000000000	PEN	25	RPPTO
3480	1	80	15	0.000000000000000000000000000000	PEN	25	RPPTO
3481	1	80	16	0.000000000000000000000000000000	PEN	25	RPPTO
3482	1	80	17	123750.000000000000000000000000000000	PEN	25	RPPTO
3483	1	80	18	61875.000000000000000000000000000000	PEN	25	RPPTO
3484	1	80	19	0.000000000000000000000000000000	PEN	25	RPPTO
3485	1	80	20	0.000000000000000000000000000000	PEN	25	RPPTO
3486	1	80	21	0.000000000000000000000000000000	PEN	25	RPPTO
3487	1	80	22	0.000000000000000000000000000000	PEN	25	RPPTO
3488	1	80	23	0.000000000000000000000000000000	PEN	25	RPPTO
3489	1	80	24	0.000000000000000000000000000000	PEN	25	RPPTO
3490	1	96	13	22000.000000000000000000000000000000	PEN	19	RPPTO
3491	1	96	14	22000.000000000000000000000000000000	PEN	19	RPPTO
3492	1	96	15	22000.000000000000000000000000000000	PEN	19	RPPTO
3493	1	96	16	22000.000000000000000000000000000000	PEN	19	RPPTO
3494	1	96	17	22000.000000000000000000000000000000	PEN	19	RPPTO
3495	1	96	18	22000.000000000000000000000000000000	PEN	19	RPPTO
3496	1	96	19	22000.000000000000000000000000000000	PEN	19	RPPTO
3497	1	96	20	22000.000000000000000000000000000000	PEN	19	RPPTO
3498	1	96	21	22000.000000000000000000000000000000	PEN	19	RPPTO
3499	1	96	22	22000.000000000000000000000000000000	PEN	19	RPPTO
3500	1	96	23	22000.000000000000000000000000000000	PEN	19	RPPTO
3501	1	96	24	22000.000000000000000000000000000000	PEN	19	RPPTO
3502	1	89	13	24000.000000000000000000000000000000	PEN	19	RPPTO
3503	1	89	14	24000.000000000000000000000000000000	PEN	19	RPPTO
3504	1	89	15	24000.000000000000000000000000000000	PEN	19	RPPTO
3505	1	89	16	24000.000000000000000000000000000000	PEN	19	RPPTO
3506	1	89	17	24000.000000000000000000000000000000	PEN	19	RPPTO
3507	1	89	18	24000.000000000000000000000000000000	PEN	19	RPPTO
3508	1	89	19	24000.000000000000000000000000000000	PEN	19	RPPTO
3509	1	89	20	24000.000000000000000000000000000000	PEN	19	RPPTO
3510	1	89	21	24000.000000000000000000000000000000	PEN	19	RPPTO
3511	1	89	22	24000.000000000000000000000000000000	PEN	19	RPPTO
3512	1	89	23	24000.000000000000000000000000000000	PEN	19	RPPTO
3513	1	89	24	24000.000000000000000000000000000000	PEN	19	RPPTO
3514	1	73	13	2625.000000000000000000000000000000	PEN	19	RPPTO
3515	1	73	14	2625.000000000000000000000000000000	PEN	19	RPPTO
3516	1	73	15	2625.000000000000000000000000000000	PEN	19	RPPTO
3517	1	73	16	2625.000000000000000000000000000000	PEN	19	RPPTO
3518	1	73	17	4537.500000000000000000000000000000	PEN	19	RPPTO
3519	1	73	18	3525.000000000000000000000000000000	PEN	19	RPPTO
3520	1	73	19	2625.000000000000000000000000000000	PEN	19	RPPTO
3521	1	73	20	2625.000000000000000000000000000000	PEN	19	RPPTO
3522	1	73	21	2625.000000000000000000000000000000	PEN	19	RPPTO
3523	1	73	22	2625.000000000000000000000000000000	PEN	19	RPPTO
3524	1	73	23	2625.000000000000000000000000000000	PEN	19	RPPTO
3525	1	73	24	2625.000000000000000000000000000000	PEN	19	RPPTO
3526	1	75	13	0.000000000000000000000000000000	PEN	19	RPPTO
3527	1	75	14	36750.000000000000000000000000000000	PEN	19	RPPTO
3528	1	75	15	0.000000000000000000000000000000	PEN	19	RPPTO
3529	1	75	16	0.000000000000000000000000000000	PEN	19	RPPTO
3530	1	75	17	0.000000000000000000000000000000	PEN	19	RPPTO
3531	1	75	18	0.000000000000000000000000000000	PEN	19	RPPTO
3532	1	75	19	0.000000000000000000000000000000	PEN	19	RPPTO
3533	1	75	20	0.000000000000000000000000000000	PEN	19	RPPTO
3534	1	75	21	0.000000000000000000000000000000	PEN	19	RPPTO
3535	1	75	22	0.000000000000000000000000000000	PEN	19	RPPTO
3536	1	75	23	0.000000000000000000000000000000	PEN	19	RPPTO
3537	1	75	24	0.000000000000000000000000000000	PEN	19	RPPTO
3538	1	29	13	11250.000000000000000000000000000000	PEN	19	RPPTO
3539	1	29	14	11250.000000000000000000000000000000	PEN	19	RPPTO
3540	1	29	15	11250.000000000000000000000000000000	PEN	19	RPPTO
3541	1	29	16	11250.000000000000000000000000000000	PEN	19	RPPTO
3542	1	29	17	11250.000000000000000000000000000000	PEN	19	RPPTO
3543	1	29	18	11250.000000000000000000000000000000	PEN	19	RPPTO
3544	1	29	19	11250.000000000000000000000000000000	PEN	19	RPPTO
3545	1	29	20	11250.000000000000000000000000000000	PEN	19	RPPTO
3546	1	29	21	11250.000000000000000000000000000000	PEN	19	RPPTO
3547	1	29	22	11250.000000000000000000000000000000	PEN	19	RPPTO
3548	1	29	23	11250.000000000000000000000000000000	PEN	19	RPPTO
3549	1	29	24	11250.000000000000000000000000000000	PEN	19	RPPTO
3550	1	91	13	9000.000000000000000000000000000000	PEN	19	RPPTO
3551	1	91	14	9000.000000000000000000000000000000	PEN	19	RPPTO
3552	1	91	15	9000.000000000000000000000000000000	PEN	19	RPPTO
3553	1	91	16	9000.000000000000000000000000000000	PEN	19	RPPTO
3554	1	91	17	9000.000000000000000000000000000000	PEN	19	RPPTO
3555	1	91	18	9000.000000000000000000000000000000	PEN	19	RPPTO
3556	1	91	19	9000.000000000000000000000000000000	PEN	19	RPPTO
3557	1	91	20	9000.000000000000000000000000000000	PEN	19	RPPTO
3558	1	91	21	9000.000000000000000000000000000000	PEN	19	RPPTO
3559	1	91	22	9000.000000000000000000000000000000	PEN	19	RPPTO
3560	1	91	23	9000.000000000000000000000000000000	PEN	19	RPPTO
3561	1	91	24	9000.000000000000000000000000000000	PEN	19	RPPTO
3562	1	82	13	1875.000000000000000000000000000000	PEN	29	RPPTO
3563	1	82	14	1875.000000000000000000000000000000	PEN	29	RPPTO
3564	1	82	15	1875.000000000000000000000000000000	PEN	29	RPPTO
3565	1	82	16	1875.000000000000000000000000000000	PEN	29	RPPTO
3566	1	82	17	1875.000000000000000000000000000000	PEN	29	RPPTO
3567	1	82	18	1875.000000000000000000000000000000	PEN	29	RPPTO
3568	1	82	19	1875.000000000000000000000000000000	PEN	29	RPPTO
3569	1	82	20	1875.000000000000000000000000000000	PEN	29	RPPTO
3570	1	82	21	1875.000000000000000000000000000000	PEN	29	RPPTO
3571	1	82	22	1875.000000000000000000000000000000	PEN	29	RPPTO
3572	1	82	23	1875.000000000000000000000000000000	PEN	29	RPPTO
3573	1	82	24	1875.000000000000000000000000000000	PEN	29	RPPTO
3574	1	93	13	7462.500000000000000000000000000000	PEN	31	RPPTO
3575	1	93	14	7462.500000000000000000000000000000	PEN	31	RPPTO
3576	1	93	15	7462.500000000000000000000000000000	PEN	31	RPPTO
3577	1	93	16	7462.500000000000000000000000000000	PEN	31	RPPTO
3578	1	93	17	7462.500000000000000000000000000000	PEN	31	RPPTO
3579	1	93	18	7462.500000000000000000000000000000	PEN	31	RPPTO
3580	1	93	19	7462.500000000000000000000000000000	PEN	31	RPPTO
3581	1	93	20	7462.500000000000000000000000000000	PEN	31	RPPTO
3582	1	93	21	7462.500000000000000000000000000000	PEN	31	RPPTO
3583	1	93	22	7462.500000000000000000000000000000	PEN	31	RPPTO
3584	1	93	23	7462.500000000000000000000000000000	PEN	31	RPPTO
3585	1	93	24	7462.500000000000000000000000000000	PEN	31	RPPTO
3586	1	94	13	1202.290000000000000000000000000000	PEN	30	RPPTO
3587	1	94	14	1202.290000000000000000000000000000	PEN	30	RPPTO
3588	1	94	15	1202.290000000000000000000000000000	PEN	30	RPPTO
3589	1	94	16	1202.290000000000000000000000000000	PEN	30	RPPTO
3590	1	94	17	1202.290000000000000000000000000000	PEN	30	RPPTO
3591	1	94	18	1202.290000000000000000000000000000	PEN	30	RPPTO
3592	1	94	19	1202.290000000000000000000000000000	PEN	30	RPPTO
3593	1	94	20	1202.290000000000000000000000000000	PEN	30	RPPTO
3594	1	94	21	1202.290000000000000000000000000000	PEN	30	RPPTO
3595	1	94	22	1202.290000000000000000000000000000	PEN	30	RPPTO
3596	1	94	23	1202.290000000000000000000000000000	PEN	30	RPPTO
3597	1	94	24	1202.290000000000000000000000000000	PEN	30	RPPTO
3598	1	95	13	5500.000000000000000000000000000000	PEN	31	RPPTO
3599	1	95	14	1459.180000000000000000000000000000	PEN	31	RPPTO
3600	1	95	15	1459.180000000000000000000000000000	PEN	31	RPPTO
3601	1	95	16	1459.180000000000000000000000000000	PEN	31	RPPTO
3602	1	95	17	1459.180000000000000000000000000000	PEN	31	RPPTO
3603	1	95	18	1459.180000000000000000000000000000	PEN	31	RPPTO
3604	1	95	19	1459.180000000000000000000000000000	PEN	31	RPPTO
3605	1	95	20	1459.180000000000000000000000000000	PEN	31	RPPTO
3606	1	95	21	1459.180000000000000000000000000000	PEN	31	RPPTO
3607	1	95	22	1459.180000000000000000000000000000	PEN	31	RPPTO
3608	1	95	23	1459.180000000000000000000000000000	PEN	31	RPPTO
3609	1	95	24	1459.180000000000000000000000000000	PEN	31	RPPTO
3610	1	40	13	7500.000000000000000000000000000000	PEN	31	RPPTO
3611	1	40	14	7500.000000000000000000000000000000	PEN	31	RPPTO
3612	1	40	15	7500.000000000000000000000000000000	PEN	31	RPPTO
3613	1	40	16	7500.000000000000000000000000000000	PEN	31	RPPTO
3614	1	40	17	7500.000000000000000000000000000000	PEN	31	RPPTO
3615	1	40	18	7500.000000000000000000000000000000	PEN	31	RPPTO
3616	1	40	19	7500.000000000000000000000000000000	PEN	31	RPPTO
3617	1	40	20	7500.000000000000000000000000000000	PEN	31	RPPTO
3618	1	40	21	7500.000000000000000000000000000000	PEN	31	RPPTO
3619	1	40	22	7500.000000000000000000000000000000	PEN	31	RPPTO
3620	1	40	23	7500.000000000000000000000000000000	PEN	31	RPPTO
3621	1	40	24	7500.000000000000000000000000000000	PEN	31	RPPTO
3622	1	22	13	45000.000000000000000000000000000000	PEN	31	RPPTO
3623	1	22	14	45000.000000000000000000000000000000	PEN	31	RPPTO
3624	1	22	15	45000.000000000000000000000000000000	PEN	31	RPPTO
3625	1	22	16	45000.000000000000000000000000000000	PEN	31	RPPTO
3626	1	22	17	45000.000000000000000000000000000000	PEN	31	RPPTO
3627	1	22	18	45000.000000000000000000000000000000	PEN	31	RPPTO
3628	1	22	19	45000.000000000000000000000000000000	PEN	31	RPPTO
3629	1	22	20	45000.000000000000000000000000000000	PEN	31	RPPTO
3630	1	22	21	45000.000000000000000000000000000000	PEN	31	RPPTO
3631	1	22	22	45000.000000000000000000000000000000	PEN	31	RPPTO
3632	1	22	23	45000.000000000000000000000000000000	PEN	31	RPPTO
3633	1	22	24	45000.000000000000000000000000000000	PEN	31	RPPTO
3634	1	67	13	0.000000000000000000000000000000	PEN	31	RPPTO
3635	1	67	14	0.000000000000000000000000000000	PEN	31	RPPTO
3636	1	67	15	0.000000000000000000000000000000	PEN	31	RPPTO
3637	1	67	16	0.000000000000000000000000000000	PEN	31	RPPTO
3638	1	67	17	0.000000000000000000000000000000	PEN	31	RPPTO
3639	1	67	18	0.000000000000000000000000000000	PEN	31	RPPTO
3640	1	67	19	0.000000000000000000000000000000	PEN	31	RPPTO
3641	1	67	20	0.000000000000000000000000000000	PEN	31	RPPTO
3642	1	67	21	0.000000000000000000000000000000	PEN	31	RPPTO
3643	1	67	22	0.000000000000000000000000000000	PEN	31	RPPTO
3644	1	67	23	0.000000000000000000000000000000	PEN	31	RPPTO
3645	1	67	24	562500.000000000000000000000000000000	PEN	31	RPPTO
3646	1	66	13	0.000000000000000000000000000000	PEN	31	RPPTO
3647	1	66	14	0.000000000000000000000000000000	PEN	31	RPPTO
3648	1	66	15	562.500000000000000000000000000000	PEN	31	RPPTO
3649	1	66	16	0.000000000000000000000000000000	PEN	31	RPPTO
3650	1	66	17	0.000000000000000000000000000000	PEN	31	RPPTO
3651	1	66	18	562.500000000000000000000000000000	PEN	31	RPPTO
3652	1	66	19	0.000000000000000000000000000000	PEN	31	RPPTO
3653	1	66	20	0.000000000000000000000000000000	PEN	31	RPPTO
3654	1	66	21	562.500000000000000000000000000000	PEN	31	RPPTO
3655	1	66	22	0.000000000000000000000000000000	PEN	31	RPPTO
3656	1	66	23	0.000000000000000000000000000000	PEN	31	RPPTO
3657	1	66	24	562.500000000000000000000000000000	PEN	31	RPPTO
3658	1	60	13	0.000000000000000000000000000000	PEN	18	RPPTO
3659	1	60	14	0.000000000000000000000000000000	PEN	18	RPPTO
3660	1	60	15	0.000000000000000000000000000000	PEN	18	RPPTO
3661	1	60	16	30000.000000000000000000000000000000	PEN	18	RPPTO
3662	1	60	17	0.000000000000000000000000000000	PEN	18	RPPTO
3663	1	60	18	0.000000000000000000000000000000	PEN	18	RPPTO
3664	1	60	19	37500.000000000000000000000000000000	PEN	18	RPPTO
3665	1	60	20	0.000000000000000000000000000000	PEN	18	RPPTO
3666	1	60	21	0.000000000000000000000000000000	PEN	18	RPPTO
3667	1	60	22	0.000000000000000000000000000000	PEN	18	RPPTO
3668	1	60	23	0.000000000000000000000000000000	PEN	18	RPPTO
3669	1	60	24	0.000000000000000000000000000000	PEN	18	RPPTO
3670	1	59	13	4087.500000000000000000000000000000	PEN	20	RPPTO
3671	1	59	14	4087.500000000000000000000000000000	PEN	20	RPPTO
3672	1	59	15	4087.500000000000000000000000000000	PEN	20	RPPTO
3673	1	59	16	4087.500000000000000000000000000000	PEN	20	RPPTO
3674	1	59	17	4087.500000000000000000000000000000	PEN	20	RPPTO
3675	1	59	18	4087.500000000000000000000000000000	PEN	20	RPPTO
3676	1	59	19	4087.500000000000000000000000000000	PEN	20	RPPTO
3677	1	59	20	4087.500000000000000000000000000000	PEN	20	RPPTO
3678	1	59	21	4087.500000000000000000000000000000	PEN	20	RPPTO
3679	1	59	22	4087.500000000000000000000000000000	PEN	20	RPPTO
3680	1	59	23	4087.500000000000000000000000000000	PEN	20	RPPTO
3681	1	59	24	4087.500000000000000000000000000000	PEN	20	RPPTO
3682	1	97	13	0.000000000000000000000000000000	PEN	20	RPPTO
3683	1	97	14	0.000000000000000000000000000000	PEN	20	RPPTO
3684	1	97	15	0.000000000000000000000000000000	PEN	20	RPPTO
3685	1	97	16	326250.000000000000000000000000000000	PEN	20	RPPTO
3686	1	97	17	0.000000000000000000000000000000	PEN	20	RPPTO
3687	1	97	18	0.000000000000000000000000000000	PEN	20	RPPTO
3688	1	97	19	0.000000000000000000000000000000	PEN	20	RPPTO
3689	1	97	20	0.000000000000000000000000000000	PEN	20	RPPTO
3690	1	97	21	0.000000000000000000000000000000	PEN	20	RPPTO
3691	1	97	22	0.000000000000000000000000000000	PEN	20	RPPTO
3692	1	97	23	0.000000000000000000000000000000	PEN	20	RPPTO
3693	1	97	24	0.000000000000000000000000000000	PEN	20	RPPTO
3694	1	106	13	0.000000000000000000000000000000	PEN	22	RPPTO
3695	1	106	14	0.000000000000000000000000000000	PEN	22	RPPTO
3696	1	106	15	0.000000000000000000000000000000	PEN	22	RPPTO
3697	1	106	16	0.000000000000000000000000000000	PEN	22	RPPTO
3698	1	106	17	0.000000000000000000000000000000	PEN	22	RPPTO
3699	1	106	18	50000.000000000000000000000000000000	PEN	22	RPPTO
3700	1	106	19	0.000000000000000000000000000000	PEN	22	RPPTO
3701	1	106	20	0.000000000000000000000000000000	PEN	22	RPPTO
3702	1	106	21	0.000000000000000000000000000000	PEN	22	RPPTO
3703	1	106	22	0.000000000000000000000000000000	PEN	22	RPPTO
3704	1	106	23	0.000000000000000000000000000000	PEN	22	RPPTO
3705	1	106	24	0.000000000000000000000000000000	PEN	22	RPPTO
3706	1	39	13	60000.000000000000000000000000000000	PEN	22	RPPTO
3707	1	39	14	60000.000000000000000000000000000000	PEN	22	RPPTO
3708	1	39	15	60000.000000000000000000000000000000	PEN	22	RPPTO
3709	1	39	16	60000.000000000000000000000000000000	PEN	22	RPPTO
3710	1	39	17	60000.000000000000000000000000000000	PEN	22	RPPTO
3711	1	39	18	60000.000000000000000000000000000000	PEN	22	RPPTO
3712	1	39	19	60000.000000000000000000000000000000	PEN	22	RPPTO
3713	1	39	20	60000.000000000000000000000000000000	PEN	22	RPPTO
3714	1	39	21	60000.000000000000000000000000000000	PEN	22	RPPTO
3715	1	39	22	60000.000000000000000000000000000000	PEN	22	RPPTO
3716	1	39	23	60000.000000000000000000000000000000	PEN	22	RPPTO
3717	1	39	24	60000.000000000000000000000000000000	PEN	22	RPPTO
3718	1	105	13	15000.000000000000000000000000000000	PEN	19	RPPTO
3719	1	105	14	15000.000000000000000000000000000000	PEN	19	RPPTO
3720	1	105	15	15000.000000000000000000000000000000	PEN	19	RPPTO
3721	1	105	16	15000.000000000000000000000000000000	PEN	19	RPPTO
3722	1	105	17	15000.000000000000000000000000000000	PEN	19	RPPTO
3723	1	105	18	15000.000000000000000000000000000000	PEN	19	RPPTO
3724	1	105	19	15000.000000000000000000000000000000	PEN	19	RPPTO
3725	1	105	20	15000.000000000000000000000000000000	PEN	19	RPPTO
3726	1	105	21	15000.000000000000000000000000000000	PEN	19	RPPTO
3727	1	105	22	15000.000000000000000000000000000000	PEN	19	RPPTO
3728	1	105	23	15000.000000000000000000000000000000	PEN	19	RPPTO
3729	1	105	24	15000.000000000000000000000000000000	PEN	19	RPPTO
3730	1	84	13	0.000000000000000000000000000000	PEN	19	RPPTO
3731	1	84	14	0.000000000000000000000000000000	PEN	19	RPPTO
3732	1	84	15	0.000000000000000000000000000000	PEN	19	RPPTO
3733	1	84	16	0.000000000000000000000000000000	PEN	19	RPPTO
3734	1	84	17	50000.000000000000000000000000000000	PEN	19	RPPTO
3735	1	84	18	0.000000000000000000000000000000	PEN	19	RPPTO
3736	1	84	19	0.000000000000000000000000000000	PEN	19	RPPTO
3737	1	84	20	0.000000000000000000000000000000	PEN	19	RPPTO
3738	1	84	21	0.000000000000000000000000000000	PEN	19	RPPTO
3739	1	84	22	0.000000000000000000000000000000	PEN	19	RPPTO
3740	1	84	23	0.000000000000000000000000000000	PEN	19	RPPTO
3741	1	84	24	50000.000000000000000000000000000000	PEN	19	RPPTO
3742	1	55	13	2992.650000000000000000000000000000	PEN	16	RPPTO
3743	1	55	14	2992.650000000000000000000000000000	PEN	16	RPPTO
3744	1	55	15	2992.650000000000000000000000000000	PEN	16	RPPTO
3745	1	55	16	2992.650000000000000000000000000000	PEN	16	RPPTO
3746	1	55	17	2992.650000000000000000000000000000	PEN	16	RPPTO
3747	1	55	18	2992.650000000000000000000000000000	PEN	16	RPPTO
3748	1	55	19	2992.650000000000000000000000000000	PEN	16	RPPTO
3749	1	55	20	2992.650000000000000000000000000000	PEN	16	RPPTO
3750	1	55	21	2992.650000000000000000000000000000	PEN	16	RPPTO
3751	1	55	22	2992.650000000000000000000000000000	PEN	16	RPPTO
3752	1	55	23	2992.650000000000000000000000000000	PEN	16	RPPTO
3753	1	55	24	2992.650000000000000000000000000000	PEN	16	RPPTO
3754	1	41	13	0.000000000000000000000000000000	PEN	16	RPPTO
3755	1	41	14	0.000000000000000000000000000000	PEN	16	RPPTO
3756	1	41	15	0.000000000000000000000000000000	PEN	16	RPPTO
3757	1	41	16	0.000000000000000000000000000000	PEN	16	RPPTO
3758	1	41	17	0.000000000000000000000000000000	PEN	16	RPPTO
3759	1	41	18	0.000000000000000000000000000000	PEN	16	RPPTO
3760	1	41	19	0.000000000000000000000000000000	PEN	16	RPPTO
3761	1	41	20	0.000000000000000000000000000000	PEN	16	RPPTO
3762	1	41	21	315000.000000000000000000000000000000	PEN	16	RPPTO
3763	1	41	22	0.000000000000000000000000000000	PEN	16	RPPTO
3764	1	41	23	0.000000000000000000000000000000	PEN	16	RPPTO
3765	1	41	24	0.000000000000000000000000000000	PEN	16	RPPTO
3766	1	49	13	300312.825000000000000000000000000000	PEN	19	RPPTO
3767	1	49	14	300312.825000000000000000000000000000	PEN	19	RPPTO
3768	1	49	15	300312.825000000000000000000000000000	PEN	19	RPPTO
3769	1	49	16	301067.775000000000000000000000000000	PEN	19	RPPTO
3770	1	49	17	301067.775000000000000000000000000000	PEN	19	RPPTO
3771	1	49	18	301067.775000000000000000000000000000	PEN	19	RPPTO
3772	1	49	19	303834.300000000000000000000000000000	PEN	19	RPPTO
3773	1	49	20	303834.300000000000000000000000000000	PEN	19	RPPTO
3774	1	49	21	303834.300000000000000000000000000000	PEN	19	RPPTO
3775	1	49	22	304635.187500000000000000000000000000	PEN	19	RPPTO
3776	1	49	23	304635.187500000000000000000000000000	PEN	19	RPPTO
3777	1	49	24	304635.187500000000000000000000000000	PEN	19	RPPTO
3778	1	42	13	86250.000000000000000000000000000000	PEN	19	RPPTO
3779	1	42	14	86250.000000000000000000000000000000	PEN	19	RPPTO
3780	1	42	15	86250.000000000000000000000000000000	PEN	19	RPPTO
3781	1	42	16	86250.000000000000000000000000000000	PEN	19	RPPTO
3782	1	42	17	86250.000000000000000000000000000000	PEN	19	RPPTO
3783	1	42	18	86250.000000000000000000000000000000	PEN	19	RPPTO
3784	1	42	19	86250.000000000000000000000000000000	PEN	19	RPPTO
3785	1	42	20	86250.000000000000000000000000000000	PEN	19	RPPTO
3786	1	42	21	86250.000000000000000000000000000000	PEN	19	RPPTO
3787	1	42	22	86250.000000000000000000000000000000	PEN	19	RPPTO
3788	1	42	23	86250.000000000000000000000000000000	PEN	19	RPPTO
3789	1	42	24	86250.000000000000000000000000000000	PEN	19	RPPTO
3790	1	88	13	124687.500000000000000000000000000000	PEN	19	RPPTO
3791	1	88	14	124687.500000000000000000000000000000	PEN	19	RPPTO
3792	1	88	15	124687.500000000000000000000000000000	PEN	19	RPPTO
3793	1	88	16	124687.500000000000000000000000000000	PEN	19	RPPTO
3794	1	88	17	124687.500000000000000000000000000000	PEN	19	RPPTO
3795	1	88	18	124687.500000000000000000000000000000	PEN	19	RPPTO
3796	1	88	19	124687.500000000000000000000000000000	PEN	19	RPPTO
3797	1	88	20	124687.500000000000000000000000000000	PEN	19	RPPTO
3798	1	88	21	124687.500000000000000000000000000000	PEN	19	RPPTO
3799	1	88	22	124687.500000000000000000000000000000	PEN	19	RPPTO
3800	1	88	23	124687.500000000000000000000000000000	PEN	19	RPPTO
3801	1	88	24	124687.500000000000000000000000000000	PEN	19	RPPTO
3802	1	26	13	0.000000000000000000000000000000	PEN	19	RPPTO
3803	1	26	14	0.000000000000000000000000000000	PEN	19	RPPTO
3804	1	26	15	0.000000000000000000000000000000	PEN	19	RPPTO
3805	1	26	16	0.000000000000000000000000000000	PEN	19	RPPTO
3806	1	26	17	0.000000000000000000000000000000	PEN	19	RPPTO
3807	1	26	18	0.000000000000000000000000000000	PEN	19	RPPTO
3808	1	26	19	0.000000000000000000000000000000	PEN	19	RPPTO
3809	1	26	20	0.000000000000000000000000000000	PEN	19	RPPTO
3810	1	26	21	82500.000000000000000000000000000000	PEN	19	RPPTO
3811	1	26	22	0.000000000000000000000000000000	PEN	19	RPPTO
3812	1	26	23	0.000000000000000000000000000000	PEN	19	RPPTO
3813	1	26	24	0.000000000000000000000000000000	PEN	19	RPPTO
3814	1	43	13	3750.000000000000000000000000000000	PEN	5	RPPTO
3815	1	43	14	3750.000000000000000000000000000000	PEN	5	RPPTO
3816	1	43	15	3750.000000000000000000000000000000	PEN	5	RPPTO
3817	1	43	16	3750.000000000000000000000000000000	PEN	5	RPPTO
3818	1	43	17	3750.000000000000000000000000000000	PEN	5	RPPTO
3819	1	43	18	3750.000000000000000000000000000000	PEN	5	RPPTO
3820	1	43	19	3750.000000000000000000000000000000	PEN	5	RPPTO
3821	1	43	20	3750.000000000000000000000000000000	PEN	5	RPPTO
3822	1	43	21	3750.000000000000000000000000000000	PEN	5	RPPTO
3823	1	43	22	3750.000000000000000000000000000000	PEN	5	RPPTO
3824	1	43	23	3750.000000000000000000000000000000	PEN	5	RPPTO
3825	1	43	24	3750.000000000000000000000000000000	PEN	5	RPPTO
3826	1	44	13	2625.000000000000000000000000000000	PEN	6	RPPTO
3827	1	44	14	2625.000000000000000000000000000000	PEN	6	RPPTO
3828	1	44	15	2625.000000000000000000000000000000	PEN	6	RPPTO
3829	1	44	16	2625.000000000000000000000000000000	PEN	6	RPPTO
3830	1	44	17	2625.000000000000000000000000000000	PEN	6	RPPTO
3831	1	44	18	2625.000000000000000000000000000000	PEN	6	RPPTO
3832	1	44	19	2625.000000000000000000000000000000	PEN	6	RPPTO
3833	1	44	20	2625.000000000000000000000000000000	PEN	6	RPPTO
3834	1	44	21	2625.000000000000000000000000000000	PEN	6	RPPTO
3835	1	44	22	2625.000000000000000000000000000000	PEN	6	RPPTO
3836	1	44	23	2625.000000000000000000000000000000	PEN	6	RPPTO
3837	1	44	24	2625.000000000000000000000000000000	PEN	6	RPPTO
3838	1	45	13	5250.000000000000000000000000000000	PEN	12	RPPTO
3839	1	45	14	5250.000000000000000000000000000000	PEN	12	RPPTO
3840	1	45	15	5250.000000000000000000000000000000	PEN	12	RPPTO
3841	1	45	16	5250.000000000000000000000000000000	PEN	12	RPPTO
3842	1	45	17	5250.000000000000000000000000000000	PEN	12	RPPTO
3843	1	45	18	5250.000000000000000000000000000000	PEN	12	RPPTO
3844	1	45	19	5250.000000000000000000000000000000	PEN	12	RPPTO
3845	1	45	20	5250.000000000000000000000000000000	PEN	12	RPPTO
3846	1	45	21	5250.000000000000000000000000000000	PEN	12	RPPTO
3847	1	45	22	5250.000000000000000000000000000000	PEN	12	RPPTO
3848	1	45	23	5250.000000000000000000000000000000	PEN	12	RPPTO
3849	1	45	24	5250.000000000000000000000000000000	PEN	12	RPPTO
3850	1	47	13	11359.500000000000000000000000000000	PEN	7	RPPTO
3851	1	47	14	11359.500000000000000000000000000000	PEN	7	RPPTO
3852	1	47	15	11359.500000000000000000000000000000	PEN	7	RPPTO
3853	1	47	16	11359.500000000000000000000000000000	PEN	7	RPPTO
3854	1	47	17	11359.500000000000000000000000000000	PEN	7	RPPTO
3855	1	47	18	11359.500000000000000000000000000000	PEN	7	RPPTO
3856	1	47	19	14794.050000000000000000000000000000	PEN	7	RPPTO
3857	1	47	20	14794.050000000000000000000000000000	PEN	7	RPPTO
3858	1	47	21	14794.050000000000000000000000000000	PEN	7	RPPTO
3859	1	47	22	14794.050000000000000000000000000000	PEN	7	RPPTO
3860	1	47	23	14794.050000000000000000000000000000	PEN	7	RPPTO
3861	1	47	24	14794.050000000000000000000000000000	PEN	7	RPPTO
3862	1	46	13	5250.000000000000000000000000000000	PEN	11	RPPTO
3863	1	46	14	5250.000000000000000000000000000000	PEN	11	RPPTO
3864	1	46	15	5250.000000000000000000000000000000	PEN	11	RPPTO
3865	1	46	16	5250.000000000000000000000000000000	PEN	11	RPPTO
3866	1	46	17	5250.000000000000000000000000000000	PEN	11	RPPTO
3867	1	46	18	5250.000000000000000000000000000000	PEN	11	RPPTO
3868	1	46	19	5250.000000000000000000000000000000	PEN	11	RPPTO
3869	1	46	20	5250.000000000000000000000000000000	PEN	11	RPPTO
3870	1	46	21	5250.000000000000000000000000000000	PEN	11	RPPTO
3871	1	46	22	5250.000000000000000000000000000000	PEN	11	RPPTO
3872	1	46	23	5250.000000000000000000000000000000	PEN	11	RPPTO
3873	1	46	24	5250.000000000000000000000000000000	PEN	11	RPPTO
3874	1	21	13	25800.000000000000000000000000000000	PEN	19	RPPTO
3875	1	21	14	25800.000000000000000000000000000000	PEN	19	RPPTO
3876	1	21	15	25800.000000000000000000000000000000	PEN	19	RPPTO
3877	1	21	16	25800.000000000000000000000000000000	PEN	19	RPPTO
3878	1	21	17	25800.000000000000000000000000000000	PEN	19	RPPTO
3879	1	21	18	25800.000000000000000000000000000000	PEN	19	RPPTO
3880	1	21	19	25800.000000000000000000000000000000	PEN	19	RPPTO
3881	1	21	20	25800.000000000000000000000000000000	PEN	19	RPPTO
3882	1	21	21	25800.000000000000000000000000000000	PEN	19	RPPTO
3883	1	21	22	25800.000000000000000000000000000000	PEN	19	RPPTO
3884	1	21	23	25800.000000000000000000000000000000	PEN	19	RPPTO
3885	1	21	24	25800.000000000000000000000000000000	PEN	19	RPPTO
3886	1	85	13	30000.000000000000000000000000000000	PEN	19	RPPTO
3887	1	85	14	30000.000000000000000000000000000000	PEN	19	RPPTO
3888	1	85	15	30000.000000000000000000000000000000	PEN	19	RPPTO
3889	1	85	16	30000.000000000000000000000000000000	PEN	19	RPPTO
3890	1	85	17	30000.000000000000000000000000000000	PEN	19	RPPTO
3891	1	85	18	30000.000000000000000000000000000000	PEN	19	RPPTO
3892	1	85	19	30000.000000000000000000000000000000	PEN	19	RPPTO
3893	1	85	20	30000.000000000000000000000000000000	PEN	19	RPPTO
3894	1	85	21	30000.000000000000000000000000000000	PEN	19	RPPTO
3895	1	85	22	30000.000000000000000000000000000000	PEN	19	RPPTO
3896	1	85	23	30000.000000000000000000000000000000	PEN	19	RPPTO
3897	1	85	24	30000.000000000000000000000000000000	PEN	19	RPPTO
3898	1	104	13	16500.000000000000000000000000000000	PEN	19	RPPTO
3899	1	104	14	16500.000000000000000000000000000000	PEN	19	RPPTO
3900	1	104	15	16500.000000000000000000000000000000	PEN	19	RPPTO
3901	1	104	16	16500.000000000000000000000000000000	PEN	19	RPPTO
3902	1	104	17	16500.000000000000000000000000000000	PEN	19	RPPTO
3903	1	104	18	16500.000000000000000000000000000000	PEN	19	RPPTO
3904	1	104	19	16500.000000000000000000000000000000	PEN	19	RPPTO
3905	1	104	20	16500.000000000000000000000000000000	PEN	19	RPPTO
3906	1	104	21	16500.000000000000000000000000000000	PEN	19	RPPTO
3907	1	104	22	16500.000000000000000000000000000000	PEN	19	RPPTO
3908	1	104	23	16500.000000000000000000000000000000	PEN	19	RPPTO
3909	1	104	24	16500.000000000000000000000000000000	PEN	19	RPPTO
3910	1	56	13	12000.000000000000000000000000000000	PEN	19	RPPTO
3911	1	56	14	12000.000000000000000000000000000000	PEN	19	RPPTO
3912	1	56	15	12000.000000000000000000000000000000	PEN	19	RPPTO
3913	1	56	16	12000.000000000000000000000000000000	PEN	19	RPPTO
3914	1	56	17	12000.000000000000000000000000000000	PEN	19	RPPTO
3915	1	56	18	12000.000000000000000000000000000000	PEN	19	RPPTO
3916	1	56	19	14000.000000000000000000000000000000	PEN	19	RPPTO
3917	1	56	20	14000.000000000000000000000000000000	PEN	19	RPPTO
3918	1	56	21	14000.000000000000000000000000000000	PEN	19	RPPTO
3919	1	56	22	14000.000000000000000000000000000000	PEN	19	RPPTO
3920	1	56	23	14000.000000000000000000000000000000	PEN	19	RPPTO
3921	1	56	24	14000.000000000000000000000000000000	PEN	19	RPPTO
3922	1	34	13	15375.000000000000000000000000000000	PEN	22	RPPTO
3923	1	34	14	15375.000000000000000000000000000000	PEN	22	RPPTO
3924	1	34	15	15375.000000000000000000000000000000	PEN	22	RPPTO
3925	1	34	16	15375.000000000000000000000000000000	PEN	22	RPPTO
3926	1	34	17	15375.000000000000000000000000000000	PEN	22	RPPTO
3927	1	34	18	15375.000000000000000000000000000000	PEN	22	RPPTO
3928	1	34	19	15375.000000000000000000000000000000	PEN	22	RPPTO
3929	1	34	20	15375.000000000000000000000000000000	PEN	22	RPPTO
3930	1	34	21	15375.000000000000000000000000000000	PEN	22	RPPTO
3931	1	34	22	15375.000000000000000000000000000000	PEN	22	RPPTO
3932	1	34	23	15375.000000000000000000000000000000	PEN	22	RPPTO
3933	1	34	24	15375.000000000000000000000000000000	PEN	22	RPPTO
3934	1	23	13	0.000000000000000000000000000000	PEN	22	RPPTO
3935	1	23	14	0.000000000000000000000000000000	PEN	22	RPPTO
3936	1	23	15	5000.000000000000000000000000000000	PEN	22	RPPTO
3937	1	23	16	0.000000000000000000000000000000	PEN	22	RPPTO
3938	1	23	17	0.000000000000000000000000000000	PEN	22	RPPTO
3939	1	23	18	5000.000000000000000000000000000000	PEN	22	RPPTO
3940	1	23	19	0.000000000000000000000000000000	PEN	22	RPPTO
3941	1	23	20	0.000000000000000000000000000000	PEN	22	RPPTO
3942	1	23	21	5000.000000000000000000000000000000	PEN	22	RPPTO
3943	1	23	22	0.000000000000000000000000000000	PEN	22	RPPTO
3944	1	23	23	0.000000000000000000000000000000	PEN	22	RPPTO
3945	1	23	24	5000.000000000000000000000000000000	PEN	22	RPPTO
3946	1	57	13	0.000000000000000000000000000000	PEN	22	RPPTO
3947	1	57	14	0.000000000000000000000000000000	PEN	22	RPPTO
3948	1	57	15	7000.000000000000000000000000000000	PEN	22	RPPTO
3949	1	57	16	0.000000000000000000000000000000	PEN	22	RPPTO
3950	1	57	17	0.000000000000000000000000000000	PEN	22	RPPTO
3951	1	57	18	7000.000000000000000000000000000000	PEN	22	RPPTO
3952	1	57	19	0.000000000000000000000000000000	PEN	22	RPPTO
3953	1	57	20	0.000000000000000000000000000000	PEN	22	RPPTO
3954	1	57	21	7000.000000000000000000000000000000	PEN	22	RPPTO
3955	1	57	22	0.000000000000000000000000000000	PEN	22	RPPTO
3956	1	57	23	0.000000000000000000000000000000	PEN	22	RPPTO
3957	1	57	24	7000.000000000000000000000000000000	PEN	22	RPPTO
3958	1	38	13	0.000000000000000000000000000000	PEN	22	RPPTO
3959	1	38	14	0.000000000000000000000000000000	PEN	22	RPPTO
3960	1	38	15	0.000000000000000000000000000000	PEN	22	RPPTO
3961	1	38	16	0.000000000000000000000000000000	PEN	22	RPPTO
3962	1	38	17	0.000000000000000000000000000000	PEN	22	RPPTO
3963	1	38	18	0.000000000000000000000000000000	PEN	22	RPPTO
3964	1	38	19	45000.000000000000000000000000000000	PEN	22	RPPTO
3965	1	38	20	0.000000000000000000000000000000	PEN	22	RPPTO
3966	1	38	21	0.000000000000000000000000000000	PEN	22	RPPTO
3967	1	38	22	0.000000000000000000000000000000	PEN	22	RPPTO
3968	1	38	23	0.000000000000000000000000000000	PEN	22	RPPTO
3969	1	38	24	0.000000000000000000000000000000	PEN	22	RPPTO
3970	1	115	1	7500.000000000000000000000000000000	PEN	\N	PPTO
\.


--
-- Data for Name: BudgetVersion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BudgetVersion" (id, name, status) FROM stdin;
1	Original 2026	ACTIVE
\.


--
-- Data for Name: ControlLine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ControlLine" (id, "supportId", type, state, "periodId", "accountingPeriodId", "invoiceId", "poId", description, currency, "amountForeign", "fxRateProvisional", "fxRateFinal", "amountLocal", "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: CostCenter; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CostCenter" (id, code, name) FROM stdin;
5	21.94.12.V	\N
6	60.60.12.V	\N
7	66.66.12.V	\N
8	71.32.01.F	\N
9	71.32.01.V	\N
10	71.38.01.V	\N
11	71.39.01.V	\N
12	71.40.12.V	\N
13	76.11.01.V	\N
14	76.13.01.V	\N
15	76.15.01.V	\N
16	80.05.99.F	\N
17	80.12.99.F	\N
18	80.13.99.F	\N
19	81.10.99.F	\N
20	83.05.99.F	\N
21	93.03.99.F	\N
22	93.10.99.F	\N
23	93.14.99.F	\N
24	94.07.99.F	\N
25	94.10.99.F	\N
26	95.05.99.F	\N
27	95.10.99.F	\N
28	96.10.98.F	\N
38	CC-TI	TI Corporativo
39	CC-MKT	Marketing
29	Dotaci?n Lima	?
30	Dotaci?n Provincia	?
31	Dotaci?n Total	?
\.


--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Document" (id, "driveFileId", "driveFolderId", filename, "mimeType", "sizeBytes", category, "uploadedBy", "uploadedAt") FROM stdin;
1	1ywl-td14nFrVAZYmUsguJJRl-onmbC9u	1XpmvY61NIyJQ-hx-DLATqQl7QUygPqHk	Propuesta de Servicio - Analista programador fullstack- QDS_IS20250224-01 - V1.00(1) (1) (1).pdf	application/pdf	254907	COTIZACION	1	2025-12-19 00:37:11.844
2	13j1G6UqJI1Kn0j_9wSQjngrQ6jWuEDfK	1n5FFUnDVCLgBsfErFA4Hk4N9JoXrLcp9	Propuesta de Servicio - Analista programador fullstack- QDS_IS20250224-01 - V1.00(1) (1) (1).pdf	application/pdf	254907	COTIZACION	1	2025-12-19 14:16:08.907
\.


--
-- Data for Name: ExchangeRate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExchangeRate" (id, year, rate) FROM stdin;
1	2025	3.700000000000000000000000000000
\.


--
-- Data for Name: ExpenseConcept; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExpenseConcept" (id, name, "packageId") FROM stdin;
6	Serv.Ext.Computacionales	8
7	Proyectos TI	8
8	Infraestructura	8
9	Honorarios Profesionales Ti	8
10	Ciberseguridad	8
11	Activos fijos y compras	9
12	Bolsa Protocolo De Costos	10
13	Descuentos Colaboradores	11
14	QA Externo	12
15	Consultoria Marketing	12
16	Licencias SaaS	13
17	Servicios Cloud	13
\.


--
-- Data for Name: ExpensePackage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExpensePackage" (id, name) FROM stdin;
8	Gastos TI y Proyectos
9	Otras Cuentas
10	Otros proyectos
11	Gasto de Personal
12	Servicios Profesionales
13	Operacion TI
\.


--
-- Data for Name: FxReference; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FxReference" (id, currency, rate, "effectiveFrom", "effectiveTo") FROM stdin;
1	USD	3.750000000000000000000000000000	2026-01-01 00:00:00	2026-06-30 00:00:00
2	USD	3.700000000000000000000000000000	2026-07-01 00:00:00	\N
\.


--
-- Data for Name: HistoricoContrato; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HistoricoContrato" (id, "recursoTercId", "fechaInicio", "fechaFin", "montoMensual", "linkContrato", "createdAt") FROM stdin;
1	1	2026-01-04 00:00:00	2026-01-16 00:00:00	123.000000000000000000000000000000	\N	2026-01-08 22:22:10.124
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Invoice" (id, "vendorId", "docType", "numberNorm", currency, "totalForeign", "totalLocal", "statusCurrent", "ultimusIncident", "approvedAt", "ocId", "montoSinIgv", detalle, "createdAt", "updatedAt", "exchangeRateOverride", "mesContable", "tcEstandar", "tcReal", "montoPEN_tcEstandar", "montoPEN_tcReal", "diferenciaTC", "supportId", "proveedorId") FROM stdin;
7	\N	FACTURA	F001-21424	USD	\N	\N	EN_APROBACION	10212	2025-12-18 15:34:47.363	7	3000.000000000000000000000000000000	AAAAAAAAA	2025-12-16 03:27:57.883	2025-12-18 15:36:23.74	\N	\N	3.700000000000000000000000000000	\N	11100.000000000000000000000000000000	\N	\N	\N	\N
8	\N	FACTURA	23432	PEN	\N	\N	PAGADO	32424	\N	\N	234.000000000000000000000000000000	sdfds	2025-12-29 15:45:44.829	2025-12-29 15:52:55.989	\N	\N	\N	\N	\N	\N	\N	20	1
\.


--
-- Data for Name: InvoiceCostCenter; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InvoiceCostCenter" (id, "invoiceId", "costCenterId", amount, percentage, "createdAt") FROM stdin;
16	7	31	3000.000000000000000000000000000000	100.000000000000000000000000000000	2025-12-18 15:35:30.463
21	8	19	234.000000000000000000000000000000	100.000000000000000000000000000000	2025-12-29 15:52:55.996
\.


--
-- Data for Name: InvoicePeriod; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InvoicePeriod" (id, "invoiceId", "periodId", "createdAt") FROM stdin;
22	7	23	2025-12-18 15:35:30.451
27	8	13	2025-12-29 15:52:55.993
\.


--
-- Data for Name: InvoiceStatusHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InvoiceStatusHistory" (id, "invoiceId", status, "changedAt", "changedBy", note) FROM stdin;
20	7	INGRESADO	2025-12-16 03:27:57.929	\N	\N
21	7	EN_TESORERIA	2025-12-17 19:32:01.417	\N	\N
22	7	EN_APROBACION	2025-12-18 15:17:31.287	\N	\N
23	7	EN_CONTABILIDAD	2025-12-18 15:34:47.371	\N	Aprobado por Head. Monto con IGV: S/ 5378.91 (umbral: S/ 10000.00)
24	7	EN_APROBACION	2025-12-18 15:35:05.684	\N	\N
25	7	APROBACION_VP	2025-12-18 15:35:46.21	\N	Aprobado por Head. Monto con IGV: S/ 13098.00 (umbral: S/ 10000.00)
26	7	RECHAZADO	2025-12-18 15:36:11.386	\N	
27	7	EN_APROBACION	2025-12-18 15:36:23.747	\N	\N
28	8	INGRESADO	2025-12-29 15:45:44.85	\N	\N
29	8	PAGADO	2025-12-29 15:46:57.548	\N	\N
\.


--
-- Data for Name: Management; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Management" (id, code, name, active) FROM stdin;
4	\N	Agilidad	t
5	\N	Cloud Architect & Infrastructure	t
10	\N	Otras Areas	t
14	\N	Data	t
7	\N	IT Governance	t
8	\N	Software & Engineering	t
25	GER-COM	Gerencia Comercial	t
\.


--
-- Data for Name: OC; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OC" (id, "budgetPeriodFromId", "budgetPeriodToId", "incidenteOc", "solicitudOc", "fechaRegistro", "supportId", "periodoEnFechasText", descripcion, "nombreSolicitante", "correoSolicitante", proveedor, ruc, moneda, "importeSinIgv", estado, "numeroOc", comentario, "articuloId", "cecoId", "linkCotizacion", "createdAt", "updatedAt", "proveedorId") FROM stdin;
7	13	24	7801	SC320141	2025-12-11 05:00:00	22	De enero a diciembre	Anx 14 al 29	Iago Lopez Chapiama	iago.lopez@interseguro.com.pe	Hewlett	23432432423	USD	50000.000000000000000000000000000000	ATENDIDO	OC92123	\N	\N	\N	https://docs.google.com/spreadsheets/d/1d8ClveLg8AiLi3BwuwJUJvqnaZKDzfe2wN6svYEeft0/edit?gid=43109189#gid=43109189	2025-12-11 21:43:34.174	2025-12-16 17:37:32.53	\N
8	23	23	6789	354677	2025-12-12 05:00:00	30	\N	sdfsdf dsfsdf ds	Iago Lopez Chapiama	iago.lopez@interseguro.com.pe	sdfsdfsd	32423432432	PEN	2412.000000000000000000000000000000	ATENDER_COMPRAS	\N	\N	184	\N	https://drive.google.com/file/d/1-VFQBIgKzx4pTzSA61t6vwl6KtwQ1pKu/view?usp=sharing	2025-12-12 00:26:17.848	2025-12-18 20:29:13.293	\N
12	24	24	\N	\N	2025-12-19 00:18:33.69	21	\N	asdasd	Iago Lopez Chapiama	iago.lopez@interseguro.com.pe	asdas	34543545454	PEN	1234.000000000000000000000000000000	PENDIENTE	\N	\N	\N	\N	\N	2025-12-19 00:18:33.692	2025-12-19 00:18:33.692	\N
13	24	24	\N	\N	2025-12-19 00:37:07.263	21	\N	asdasds	Iago Lopez Chapiama	iago.lopez@interseguro.com.pe	asdasd	32432432432	PEN	324.000000000000000000000000000000	PENDIENTE	\N	\N	\N	\N	\N	2025-12-19 00:37:07.265	2025-12-19 00:37:07.265	\N
14	24	24	\N	\N	2025-12-19 14:16:03.758	21	\N	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA	Iago Lopez Chapiama	iago.lopez@interseguro.com.pe	azsdasd	12342352532	PEN	32324.000000000000000000000000000000	PENDIENTE	\N	\N	\N	\N	\N	2025-12-19 14:16:03.761	2025-12-19 14:16:03.761	\N
15	24	24	\N	\N	2025-12-23 20:41:59.88	21	\N	AAAAAAAAAAAA	Iago Lopez Chapiama	iago.lopez@interseguro.com.pe	\N	\N	PEN	1234.000000000000000000000000000000	PENDIENTE	\N	\N	\N	\N	\N	2025-12-23 20:41:59.884	2025-12-23 20:41:59.884	1
16	24	24	\N	\N	2025-12-23 20:59:08.005	21	\N	sadadasd	Iago Lopez Chapiama	iago.lopez@interseguro.com.pe	\N	\N	PEN	123.000000000000000000000000000000	PENDIENTE	\N	\N	\N	\N	\N	2025-12-23 20:59:08.007	2025-12-23 20:59:08.007	1
\.


--
-- Data for Name: OCCostCenter; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OCCostCenter" (id, "ocId", "costCenterId", "createdAt") FROM stdin;
27	7	31	2025-12-16 17:37:32.555
30	8	19	2025-12-17 19:16:19.217
34	12	19	2025-12-19 00:18:33.7
35	13	19	2025-12-19 00:37:07.274
36	14	19	2025-12-19 14:16:03.787
37	15	19	2025-12-23 20:41:59.894
38	16	19	2025-12-23 20:59:08.011
\.


--
-- Data for Name: OCDocument; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OCDocument" (id, "ocId", "documentId", "createdAt") FROM stdin;
1	13	1	2025-12-19 00:37:11.863
2	14	2	2025-12-19 14:16:08.921
\.


--
-- Data for Name: OCStatusHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OCStatusHistory" (id, "ocId", status, "changedAt", "changedBy", note) FROM stdin;
1	7	ATENDIDO	2025-12-11 05:00:00	\N	\N
2	7	PENDIENTE	2025-12-11 23:47:04.22	\N	\N
3	7	APROBACION_VP	2025-12-11 23:47:32.595	\N	\N
4	7	ATENDER_COMPRAS	2025-12-11 23:47:44.032	\N	\N
5	7	ATENDIDO	2025-12-11 23:47:54.579	\N	\N
6	7	PENDIENTE	2025-12-11 23:48:58.5	\N	\N
7	7	APROBACION_VP	2025-12-12 00:02:43.329	\N	\N
8	7	ATENDIDO	2025-12-12 00:04:12.497	\N	\N
9	7	PENDIENTE	2025-12-12 00:05:59.404	\N	\N
10	8	PENDIENTE	2025-12-12 00:26:17.846	\N	\N
11	7	APROBACION_VP	2025-12-16 03:28:47.742	\N	\N
12	7	ATENDIDO	2025-12-16 03:29:05.261	\N	\N
13	8	PROCESAR	2025-12-16 21:22:58.23	\N	\N
14	8	PENDIENTE	2025-12-16 22:06:47.403	\N	\N
15	8	PROCESADO	2025-12-17 19:15:52.104	\N	\N
16	8	ATENDER_COMPRAS	2025-12-17 19:16:24.852	\N	\N
17	8	APROBACION_VP	2025-12-18 15:13:34.758	\N	\N
18	8	ANULAR	2025-12-18 15:15:31.558	\N	\N
19	8	APROBACION_VP	2025-12-18 15:15:56.944	\N	\N
20	8	ATENDER_COMPRAS	2025-12-18 15:16:00.04	\N	Aprobado por VP
21	8	APROBACION_VP	2025-12-18 15:26:45.512	\N	\N
22	8	ATENDER_COMPRAS	2025-12-18 15:26:54.594	\N	Aprobado por VP
23	8	APROBACION_VP	2025-12-18 20:16:24.668	\N	\N
24	8	ATENDER_COMPRAS	2025-12-18 20:29:13.308	\N	Aprobado por VP
28	12	PENDIENTE	2025-12-19 00:18:33.69	\N	\N
29	13	PENDIENTE	2025-12-19 00:37:07.263	\N	\N
30	14	PENDIENTE	2025-12-19 14:16:03.758	\N	\N
31	15	PENDIENTE	2025-12-23 20:41:59.88	\N	\N
32	16	PENDIENTE	2025-12-23 20:59:08.005	\N	\N
\.


--
-- Data for Name: Period; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Period" (id, year, month, label) FROM stdin;
13	2025	1	\N
14	2025	2	\N
15	2025	3	\N
16	2025	4	\N
17	2025	5	\N
18	2025	6	\N
19	2025	7	\N
20	2025	8	\N
21	2025	9	\N
22	2025	10	\N
23	2025	11	\N
24	2025	12	\N
25	2024	1	\N
26	2024	2	\N
27	2024	3	\N
28	2024	4	\N
29	2024	5	\N
30	2024	6	\N
31	2024	7	\N
32	2024	8	\N
33	2024	9	\N
34	2024	10	\N
35	2024	11	\N
36	2024	12	\N
37	2023	1	\N
38	2023	2	\N
39	2023	3	\N
40	2023	4	\N
41	2023	5	\N
42	2023	6	\N
43	2023	7	\N
44	2023	8	\N
45	2023	9	\N
46	2023	10	\N
47	2023	11	\N
48	2023	12	\N
49	2027	1	\N
50	2027	2	\N
51	2027	3	\N
52	2027	4	\N
53	2027	5	\N
54	2027	6	\N
55	2027	7	\N
56	2027	8	\N
57	2027	9	\N
58	2027	10	\N
59	2027	11	\N
60	2027	12	\N
62	2028	1	\N
61	2028	1	\N
63	2028	2	\N
64	2028	2	\N
65	2028	3	\N
66	2028	3	\N
68	2028	4	\N
69	2028	5	\N
70	2028	6	\N
67	2028	4	\N
72	2028	5	\N
73	2028	6	\N
71	2028	7	\N
74	2028	7	\N
76	2028	8	\N
77	2028	9	\N
78	2028	10	\N
75	2028	8	\N
80	2028	9	\N
81	2028	10	\N
79	2028	11	\N
82	2028	11	\N
83	2028	12	\N
84	2028	12	\N
85	2029	1	\N
86	2029	2	\N
87	2029	3	\N
88	2029	4	\N
89	2029	5	\N
90	2029	6	\N
91	2029	7	\N
92	2029	8	\N
93	2029	9	\N
94	2029	10	\N
95	2029	11	\N
96	2029	12	\N
97	2029	1	\N
98	2029	2	\N
99	2029	3	\N
100	2029	4	\N
101	2029	5	\N
102	2029	6	\N
103	2029	7	\N
104	2029	8	\N
105	2029	9	\N
106	2029	10	\N
107	2029	11	\N
108	2029	12	\N
110	2030	1	\N
109	2030	1	\N
111	2030	2	\N
112	2030	2	\N
113	2030	3	\N
114	2030	3	\N
115	2030	4	\N
116	2030	4	\N
117	2030	5	\N
118	2030	5	\N
119	2030	6	\N
120	2030	6	\N
122	2030	7	\N
123	2030	8	\N
124	2030	9	\N
125	2030	10	\N
126	2030	11	\N
127	2030	12	\N
121	2030	7	\N
128	2030	8	\N
129	2030	9	\N
130	2030	10	\N
131	2030	11	\N
132	2030	12	\N
133	2031	1	\N
134	2031	2	\N
135	2031	3	\N
136	2031	4	\N
137	2031	5	\N
138	2031	6	\N
139	2031	7	\N
140	2031	8	\N
141	2031	9	\N
142	2031	10	\N
143	2031	11	\N
144	2031	12	\N
145	2032	1	\N
146	2032	2	\N
147	2032	3	\N
148	2032	4	\N
149	2032	5	\N
150	2032	6	\N
151	2032	7	\N
152	2032	8	\N
153	2032	9	\N
154	2032	10	\N
155	2032	11	\N
156	2032	12	\N
157	2033	1	\N
158	2033	2	\N
159	2033	3	\N
160	2033	4	\N
161	2033	5	\N
162	2033	6	\N
163	2033	7	\N
164	2033	8	\N
165	2033	9	\N
166	2033	10	\N
167	2033	11	\N
168	2033	12	\N
1	2026	1	\N
2	2026	2	\N
3	2026	3	\N
4	2026	4	\N
5	2026	5	\N
6	2026	6	\N
7	2026	7	\N
8	2026	8	\N
9	2026	9	\N
10	2026	10	\N
11	2026	11	\N
12	2026	12	\N
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Permission" (id, key, name, description, module, "parentKey", "sortOrder") FROM stdin;
90	contratos	Contratos	Acceso al módulo de contratos (recursos tercerizados)	contratos	\N	70
1	dashboard	Dashboard	Vista principal con métricas y estadísticas	\N	\N	1
2	assistant	Asistente	Asistente IA para consultas	\N	\N	2
3	reports	Reportes	Reportes y análisis de datos	\N	\N	3
4	facturas	Facturas	Gestión de facturas	\N	\N	4
5	ocs	Órdenes de Compra	Acceso completo a todos los submódulos de OC	ocs	\N	5
15	ocs:listado	OC - Listado	Vista de consulta de órdenes de compra	ocs	ocs	1
16	ocs:gestion	OC - Gestión	Registro y administración de órdenes de compra	ocs	ocs	2
17	ocs:solicitud	OC - Solicitud	Solicitud de nuevas órdenes de compra	ocs	ocs	3
22	facturas:listado	Facturas - Listado	Vista de consulta de facturas	facturas	facturas	1
23	facturas:gestion	Facturas - Gestión	Registro y administración de facturas	facturas	facturas	2
46	aprobaciones	Aprobaciones	Módulo de aprobaciones de facturas y OCs	\N	\N	5
47	aprobaciones:facturas_head	Aprobación Facturas - Head	Aprobación de facturas nivel Head	aprobaciones	aprobaciones	1
48	aprobaciones:facturas_vp	Aprobación Facturas - VP	Aprobación de facturas nivel VP (montos altos)	aprobaciones	aprobaciones	2
49	aprobaciones:ocs_vp	Aprobación OCs - VP	Aprobación de órdenes de compra nivel VP	aprobaciones	aprobaciones	3
6	provisiones	Provisiones	Gestión de provisiones	\N	\N	8
7	ppto	Presupuesto	Gestión del presupuesto	\N	\N	9
8	catalogos	Catálogos	Administración de catálogos maestros	\N	\N	10
9	manage_roles	Gestión de Roles	Administrar roles y permisos (solo super admin)	\N	\N	99
\.


--
-- Data for Name: Proveedor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Proveedor" (id, "razonSocial", ruc, active, "createdAt", "updatedAt") FROM stdin;
1	QUALITY & DEVELOPMENT SOFTWARE S.A.C.	20602464165	t	2025-12-23 20:41:45.774	2025-12-23 20:41:45.774
\.


--
-- Data for Name: Provision; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Provision" (id, "sustentoId", "periodoPpto", "periodoContable", "montoPen", detalle, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PurchaseOrder; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PurchaseOrder" (id, number, "vendorId", "incCode") FROM stdin;
\.


--
-- Data for Name: RecursoTercOC; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RecursoTercOC" (id, "recursoTercId", "ocId", "createdAt") FROM stdin;
\.


--
-- Data for Name: RecursoTercerizado; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RecursoTercerizado" (id, "nombreCompleto", cargo, "managementId", "proveedorId", "supportId", "fechaInicio", "fechaFin", "montoMensual", "linkContrato", status, observaciones, "createdAt", "updatedAt", "createdBy") FROM stdin;
2	Juancito Perez	Desarrollador	8	1	21	2026-01-07 00:00:00	2026-01-23 00:00:00	1232.000000000000000000000000000000	https://chatgpt.com/	ACTIVO	\N	2026-01-08 22:04:42.936	2026-01-08 22:04:42.936	1
1	asdas	asdasd	4	1	20	2026-01-15 00:00:00	2026-01-31 00:00:00	12000.000000000000000000000000000000	https://chatgpt.com/	ACTIVO	\N	2026-01-08 21:22:44.698	2026-01-08 22:29:58.466	1
3	Iago Lopez	Practi	4	1	26	2026-01-02 00:00:00	2026-01-14 00:00:00	1234.000000000000000000000000000000	\N	ACTIVO	\N	2026-01-08 22:05:31.267	2026-01-08 22:35:29.452	1
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, name, description, "isSystem", "createdAt", "updatedAt") FROM stdin;
2	viewer	Usuario con acceso de solo lectura a m?dulos b?sicos	t	2025-12-03 17:52:36.99	2025-12-16 04:41:22.404
1	super_admin	Administrador con acceso total al sistema	t	2025-12-03 16:40:03.391	2026-01-08 20:55:51.942
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RolePermission" (id, "roleId", "permissionId", "createdAt") FROM stdin;
55	2	1	2025-12-16 04:41:22.42
56	2	2	2025-12-16 04:41:22.42
57	2	3	2025-12-16 04:41:22.42
58	2	22	2025-12-16 04:41:22.42
59	2	15	2025-12-16 04:41:22.42
60	2	17	2025-12-16 04:41:22.42
85	1	1	2026-01-08 20:55:51.949
86	1	2	2026-01-08 20:55:51.949
87	1	9	2026-01-08 20:55:51.949
88	1	15	2026-01-08 20:55:51.949
89	1	17	2026-01-08 20:55:51.949
90	1	22	2026-01-08 20:55:51.949
91	1	3	2026-01-08 20:55:51.949
92	1	4	2026-01-08 20:55:51.949
93	1	5	2026-01-08 20:55:51.949
94	1	16	2026-01-08 20:55:51.949
95	1	23	2026-01-08 20:55:51.949
96	1	46	2026-01-08 20:55:51.949
97	1	47	2026-01-08 20:55:51.949
98	1	48	2026-01-08 20:55:51.949
99	1	49	2026-01-08 20:55:51.949
100	1	6	2026-01-08 20:55:51.949
101	1	7	2026-01-08 20:55:51.949
102	1	8	2026-01-08 20:55:51.949
103	1	90	2026-01-08 20:55:51.949
\.


--
-- Data for Name: Support; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Support" (id, code, name, "costCenterId", management, area, "vendorId", active, "expensePackageId", "expenseConceptId", "expenseType", "managementId", "areaId") FROM stdin;
55	\N	Infraestructura Prophet	\N	\N	\N	\N	t	8	7	ADMINISTRATIVO	10	24
56	\N	Infraestructura Servicios Externos	\N	\N	\N	\N	t	8	9	ADMINISTRATIVO	5	9
58	\N	ITSM FreshService	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
60	\N	Licencia Benchmark Cx	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	18
61	\N	Licencia desarrollado Apple	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	8
62	\N	Licencia Form Approvals	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	19
63	\N	Licencia GitHub Enterprise	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	8	30
64	\N	Licencia K6	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	8	30
65	\N	Licencia Sonarqube	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	8	30
66	\N	Licenciamiento Antivirus	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
67	\N	Licenciamiento de Google (Google Workspace)	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
68	\N	Licenciamiento y soporte Bloomberg	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	20
69	\N	Licenciamiento y Soporte Genesys Cloud	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	14
70	\N	Licenciamiento y soporte marcaje asistencia	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	19
71	\N	Licenciamiento y Soporte Webdox	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	21
72	\N	Licencias Automation Anywhere	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	33
73	\N	Licencias herramientas digitales	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	4	7
74	\N	Licencias Microsoft 365	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
75	\N	Licencias Tableau	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	14	28
76	\N	Mantenimiento - Certificado Digital	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
77	\N	Mantenimiento Ofisis y Actualizaciones Legales	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	19
78	\N	Mantenimiento PMS	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	20
79	\N	Mantenimiento Prophet	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	24
80	\N	Mantenimiento Ultimus Y Exactus	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	15
20	\N	Ad Self Service	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
21	\N	Agilidad Servicios Externos	\N	\N	\N	\N	t	8	9	ADMINISTRATIVO	4	7
22	\N	Arrendamiento de estaciones de trabajo	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
23	\N	Bolsa De Respuesta Ante Incidentes	\N	\N	\N	\N	t	8	10	ADMINISTRATIVO	10	23
25	\N	Capital I&Q	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	20
27	\N	Certificados SSL	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
28	\N	Chatbots - Soporte	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
29	\N	Conectividad y Monitoreo	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
30	\N	Copilot Enterprise	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	8	30
31	\N	Creative Cloud - Adobe	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
32	\N	Custodia De Cintas De Backups	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
33	\N	Custodia de Fuentes (Acsel-e)	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
34	\N	Cybersoc (Renovacion)	\N	\N	\N	\N	t	8	10	ADMINISTRATIVO	10	23
35	\N	DEPENDIENTES RENTAS	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	14
36	\N	Dominios	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
37	\N	Eficiencia	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	11
38	\N	Ethical Hacking	\N	\N	\N	\N	t	8	10	ADMINISTRATIVO	10	23
39	\N	Evolution	\N	\N	\N	\N	t	8	7	ADMINISTRATIVO	7	11
40	\N	FortiNAC + Fortitoken	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
41	\N	Gastos Anuales de Soporte Prophet	\N	\N	\N	\N	t	8	7	ADMINISTRATIVO	10	24
42	\N	GCP Data y General	\N	\N	\N	\N	t	8	8	ADMINISTRATIVO	5	8
43	\N	GCP Vehicular	\N	\N	\N	\N	t	8	8	ADMINISTRATIVO	5	8
44	\N	GCP Viajes	\N	\N	\N	\N	t	8	8	ADMINISTRATIVO	5	8
45	\N	GCP Vida	\N	\N	\N	\N	t	8	8	ADMINISTRATIVO	5	8
46	\N	GCP Vida Free	\N	\N	\N	\N	t	8	8	ADMINISTRATIVO	5	8
47	\N	GCP Websoat	\N	\N	\N	\N	t	8	8	ADMINISTRATIVO	5	8
49	\N	Google Cloud Platform	\N	\N	\N	\N	t	8	8	ADMINISTRATIVO	5	8
50	\N	Herramienta automatizacion QA	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	8	29
51	\N	Herramientas de Agilidad	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	4	7
52	\N	Hosting - Genesys Cloud	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
53	\N	ICE DATA INDICES LLC	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	20
54	\N	INFOCUOTAS RENTAS	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	14
81	\N	NYSE MARKET INC.	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	20
82	\N	Outsourcing impresion	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
83	\N	Preqin LTD	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	20
84	\N	Proyectos Internos / Consultorias	\N	\N	\N	\N	t	8	7	ADMINISTRATIVO	7	11
85	\N	Qa Servicios Externos	\N	\N	\N	\N	t	8	9	ADMINISTRATIVO	8	29
86	\N	SCORE FINANCIERO	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	14
88	\N	Servicio Gestion de infraestructura	\N	\N	\N	\N	t	8	8	ADMINISTRATIVO	5	9
89	\N	Servicio Monitoreo Infraestructura	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	32
90	\N	SERVICIO SAAS (Azure)	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	8
91	\N	Servicio Tools Jtc	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
92	\N	Servicio validacion identidad (Keynua)	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	14
93	\N	Servicios de Comunicaciones (Principal)	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
94	\N	Servicios de Comunicaciones (Provincias)	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
95	\N	Servicios de Comunicaciones (Secundario)	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
96	\N	Servicios Soporte Nocturno + Sab y Dom	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	31
97	\N	Sistema Servicio de Nomina	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	19
98	\N	SMF DATA TEC	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	20
99	\N	Software Monitoreo Aplicaciones	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	8
100	\N	Soporte Acsel-e	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
101	\N	Soporte de Central Telefonica	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
102	\N	Soporte en provincias	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
103	\N	Soporte Infraestructura de Comunicaciones	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
104	\N	Soporte Servicios Externos	\N	\N	\N	\N	t	8	9	ADMINISTRATIVO	7	12
105	\N	Soporte soluciones de fondo Acsel-e	\N	\N	\N	\N	t	8	7	ADMINISTRATIVO	7	31
106	\N	SOX	\N	\N	\N	\N	t	8	7	ADMINISTRATIVO	7	11
107	\N	Suministros y Reparaciones	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	7	12
109	\N	Suscripcion Automay	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	21
111	\N	Suscripcion Sisweb	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	14
112	\N	Teammate (Plataforma De Auditoria)	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	13
113	\N	Valtin Capital	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	22
26	\N	Auditoria SSAE18	\N	\N	\N	\N	t	8	8	ADMINISTRATIVO	5	9
57	\N	Ingenier?a Social	\N	\N	\N	\N	t	8	10	ADMINISTRATIVO	10	23
59	\N	Licencia ATS Selecci?n	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	19
115	S-0002	Marketing Digital	\N	Gerencia Comercial	Marketing	\N	t	12	15	PRODUCTO	\N	\N
24	\N	Botmaker - Implementaci?n Y Operaci?n Whatsapp	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	18
48	\N	Gesti?n DNS P?blico	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	9
87	\N	Servicio env?o de correo transaccional	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	5	8
108	\N	Suscripci?n Acsendo	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	19
110	\N	Suscripci?n Captcha	\N	\N	\N	\N	t	8	6	ADMINISTRATIVO	10	23
\.


--
-- Data for Name: SupportCostCenter; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SupportCostCenter" (id, "supportId", "costCenterId", "createdAt") FROM stdin;
24	20	19	2025-11-14 21:11:40.418
25	21	19	2025-11-14 21:11:40.431
26	22	31	2025-11-14 21:11:40.441
27	23	22	2025-11-14 21:11:40.451
33	25	28	2025-11-14 21:11:40.475
35	27	19	2025-11-14 21:11:40.494
36	28	19	2025-11-14 21:11:40.504
37	29	19	2025-11-14 21:11:40.514
38	30	19	2025-11-14 21:11:40.524
39	31	19	2025-11-14 21:11:40.534
40	32	19	2025-11-14 21:11:40.543
41	33	19	2025-11-14 21:11:40.553
42	34	22	2025-11-14 21:11:40.562
43	35	15	2025-11-14 21:11:40.575
44	35	13	2025-11-14 21:11:40.575
45	35	14	2025-11-14 21:11:40.575
46	35	9	2025-11-14 21:11:40.575
47	36	19	2025-11-14 21:11:40.585
48	37	19	2025-11-14 21:11:40.594
49	38	22	2025-11-14 21:11:40.605
50	39	22	2025-11-14 21:11:40.616
51	40	31	2025-11-14 21:11:40.626
52	41	16	2025-11-14 21:11:40.637
53	42	19	2025-11-14 21:11:40.649
54	43	5	2025-11-14 21:11:40.661
55	44	6	2025-11-14 21:11:40.673
56	45	12	2025-11-14 21:11:40.684
57	46	11	2025-11-14 21:11:40.696
58	47	7	2025-11-14 21:11:40.708
60	49	19	2025-11-14 21:11:40.73
61	50	19	2025-11-14 21:11:40.741
62	51	19	2025-11-14 21:11:40.752
63	52	19	2025-11-14 21:11:40.763
64	53	28	2025-11-14 21:11:40.774
65	54	15	2025-11-14 21:11:40.786
66	54	13	2025-11-14 21:11:40.786
67	54	14	2025-11-14 21:11:40.786
68	55	16	2025-11-14 21:11:40.797
69	56	19	2025-11-14 21:11:40.807
71	58	19	2025-11-14 21:11:40.826
73	60	18	2025-11-14 21:11:40.844
74	61	19	2025-11-14 21:11:40.854
75	62	20	2025-11-14 21:11:40.863
76	63	19	2025-11-14 21:11:40.872
77	64	19	2025-11-14 21:11:40.882
78	65	19	2025-11-14 21:11:40.891
79	66	31	2025-11-14 21:11:40.902
80	67	31	2025-11-14 21:11:40.912
81	68	28	2025-11-14 21:11:40.921
82	69	27	2025-11-14 21:11:40.931
83	70	20	2025-11-14 21:11:40.941
84	71	24	2025-11-14 21:11:40.95
85	72	22	2025-11-14 21:11:40.959
86	73	19	2025-11-14 21:11:40.969
87	74	19	2025-11-14 21:11:40.978
88	75	19	2025-11-14 21:11:40.988
89	76	19	2025-11-14 21:11:40.997
90	77	20	2025-11-14 21:11:41.006
91	78	28	2025-11-14 21:11:41.016
92	79	16	2025-11-14 21:11:41.026
93	80	25	2025-11-14 21:11:41.035
94	81	28	2025-11-14 21:11:41.044
95	82	29	2025-11-14 21:11:41.053
96	83	28	2025-11-14 21:11:41.064
97	84	19	2025-11-14 21:11:41.073
98	85	19	2025-11-14 21:11:41.083
99	86	15	2025-11-14 21:11:41.095
100	86	13	2025-11-14 21:11:41.095
101	86	14	2025-11-14 21:11:41.095
102	86	9	2025-11-14 21:11:41.095
104	88	19	2025-11-14 21:11:41.113
105	89	19	2025-11-14 21:11:41.123
106	90	19	2025-11-14 21:11:41.133
107	91	19	2025-11-14 21:11:41.143
108	92	8	2025-11-14 21:11:41.154
109	93	31	2025-11-14 21:11:41.164
110	94	30	2025-11-14 21:11:41.174
111	95	31	2025-11-14 21:11:41.183
112	96	19	2025-11-14 21:11:41.193
113	97	20	2025-11-14 21:11:41.202
114	98	28	2025-11-14 21:11:41.211
115	99	19	2025-11-14 21:11:41.221
116	100	19	2025-11-14 21:11:41.23
117	101	19	2025-11-14 21:11:41.239
118	102	19	2025-11-14 21:11:41.248
119	103	19	2025-11-14 21:11:41.258
120	104	19	2025-11-14 21:11:41.267
121	105	19	2025-11-14 21:11:41.277
122	106	22	2025-11-14 21:11:41.287
123	107	19	2025-11-14 21:11:41.297
125	109	24	2025-11-14 21:11:41.316
127	111	26	2025-11-14 21:11:41.335
128	112	21	2025-11-14 21:11:41.344
129	113	28	2025-11-14 21:11:41.353
130	26	19	2025-11-17 14:15:30.441
142	24	5	2025-12-17 15:26:08.942
143	24	12	2025-12-17 15:26:08.942
144	24	7	2025-12-17 15:26:08.942
145	24	11	2025-12-17 15:26:08.942
146	24	10	2025-12-17 15:26:08.942
147	48	19	2025-12-17 15:26:21.988
148	57	22	2025-12-17 15:26:32.119
149	59	20	2025-12-17 15:26:41.575
150	87	19	2025-12-17 15:26:50.189
151	108	20	2025-12-17 15:26:59.002
152	110	22	2025-12-17 15:27:07.092
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, name, "googleId", active, "createdAt", "updatedAt") FROM stdin;
1	iago.lopez@interseguro.com.pe	Iago Lopez Chapiama	105108911489206185953	t	2025-12-03 16:40:03.466	2025-12-03 17:38:10.921
2	isautomation.center@interseguro.com.pe	IS Automation Center	109006581726863708267	t	2025-12-05 18:46:40.751	2025-12-05 18:46:40.751
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserRole" (id, "userId", "roleId", "createdAt") FROM stdin;
1	1	1	2025-12-03 16:40:03.477
2	2	2	2025-12-05 18:46:40.791
\.


--
-- Data for Name: Vendor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Vendor" (id, "legalName", "taxId") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d32dd863-1820-451c-ad21-57a4aa163b8f	901f4061d871239682e2c4085528927c927341184ea53e2b4803a74900f5d1c1	2025-10-15 16:50:58.008333+00	20251008162928_init	\N	\N	2025-10-15 16:50:57.93787+00	1
48138759-c99a-4be7-aec3-2c98b061af88	b4bed466852bd631ea8e96c583fbd0f4dcd42ce68f8efbe64129aa6ca6a01113	2025-10-15 16:50:58.03742+00	20251008220000_support_hierarchy	\N	\N	2025-10-15 16:50:58.010555+00	1
9255fa61-af70-44a5-ab50-16f9d63611e0	657d61b8737633e6670643b1fe78d8369dfd3062450c2503d9c01312f6b15107	2025-11-11 17:28:33.080622+00	20251111122812_add_costcenter_to_budget_allocation	\N	\N	2025-11-11 17:28:33.054803+00	1
f16ef3d2-d0d6-4688-abec-5e7beca53356	3724f21d5a25739e26e79dfe41ba0d81f0711665929c1dc724a6e336b95c3dd1	2025-10-15 16:50:58.045756+00	20251009031500_support_name_unique	\N	\N	2025-10-15 16:50:58.039129+00	1
16de35c8-7cdf-408e-8edf-50b0b0510ecb	acbf34035eaed82717b645b116ab9904bb35e476d144be92dad82536d883e999	2025-10-15 16:50:58.071406+00	20251009034500_support_expense_type	\N	\N	2025-10-15 16:50:58.047305+00	1
321b31ff-b7dc-4aaa-b702-34becead9d8c	2ad84b219db1f528df18951117cf4980bf773496ca31518070931be68c585091	2025-10-15 16:50:58.098772+00	20251011000000_add_oc_and_articulo	\N	\N	2025-10-15 16:50:58.073131+00	1
b19673ad-37a3-4dae-ad02-f15c6e8f0964	b154239c09faaee198f5f512cf339644be83d216da32ed22df8bf087dcaf7546	2025-11-14 14:56:36.584611+00	20251114000000_oc_costcenter_many_to_many	\N	\N	2025-11-14 14:56:36.54413+00	1
dd5e19ac-4ac3-4983-b118-de936cffa15c	aa4033f0393576d98fb2f985dedc52e833d701035951b37894c3f2009349f90e	2025-10-15 16:50:58.119011+00	20251011010000_add_management_area	\N	\N	2025-10-15 16:50:58.101035+00	1
4c4601e1-6a0c-45f9-a5ff-f45df9c6a595	82c6c371cf9e03a9609c8c2a94d831c2889a14a05c3d38257d719d8944abeea4	2025-10-15 16:50:58.141897+00	20251013000000_catalogs_unique_names	\N	\N	2025-10-15 16:50:58.120862+00	1
4f2780fe-ede5-4e80-8c20-a3b0d84ca96d	336021e22627296738a1a31bebb804fb3cc33f0e9c2bdd14ed0c97fd545e60f7	2025-10-15 16:50:58.156682+00	20251013010000_invoice_oc_integration	\N	\N	2025-10-15 16:50:58.145294+00	1
a7280fc6-9a1f-47ac-b4ff-1cf22c2f7043	a8141cd5747886c7936311f271b3b72e7c7fa39352acfd0fe6e8e14057b11298	2025-11-14 16:13:59.320467+00	20251114000001_invoice_periods_costcenters_mn	\N	\N	2025-11-14 16:13:59.268681+00	1
00bcdf10-00f9-468d-adf3-f1f1c13c539f	c92cb3a11c0bf4e7e48ce2423ae656a8948b7d2dddeed6973c3912a7fb96b1fe	2025-10-15 16:50:58.164856+00	20251015000000_add_invoice_timestamps	\N	\N	2025-10-15 16:50:58.158652+00	1
acc1b066-e52e-40e4-956c-90a10e6d1692	c9b45384fbc151a640c2cd512a15a650c3fc1ba92344f7ed0fe21ae359b34253	2025-11-04 17:57:52.483383+00	20251104000000_articulo_ceco_code_unique	\N	\N	2025-11-04 17:57:52.466086+00	1
ebc50b95-e9a3-45d2-a9b5-3d502ce7f19d	ff541aecbf55a295963b6c71ebdccf16237299e4fb9084a657b0cac874555aec	2025-11-04 18:16:49.770356+00	20251104010000_costcenter_name_optional	\N	\N	2025-11-04 18:16:49.762534+00	1
37e198e0-3c40-4beb-8e25-454c02154c8e	7a45b63b8e80b141464f8ab1c1089b21ba9a91829e1d397b7f9eb0fbac789140	2025-11-14 19:31:22.872093+00	20251114200000_exchange_rate_and_override	\N	\N	2025-11-14 19:31:22.843928+00	1
d242eba5-be37-4632-832c-31a52ee83c03	53e26041022277a8201515ebefa1a67dbb033f6b3479930e5e9f32c9827e7544	2025-11-04 19:45:44.019115+00	20251104020000_support_cascade_delete	\N	\N	2025-11-04 19:45:43.998408+00	1
acec1830-f8a1-4fdb-9b69-5f0427f21a23	a714d72accc8ed37dd5ff1d0305dde13d32c75969a6f8f236abd708c481a06f1	2025-11-04 20:44:41.745403+00	20251104030000_support_costcenter_many_to_many	\N	\N	2025-11-04 20:44:41.70481+00	1
0983e636-9f7b-4742-b9e7-37e0041bee58	21fe903f75ddd130c43336234c8f2bcedaeb588667d9aa23be503e7444fca65d	2025-11-18 19:14:01.183125+00	20251117000000_invoice_accounting_fields	\N	\N	2025-11-18 19:14:01.174906+00	1
899102b3-43da-42d8-98e4-84b06787958c	f3f37e7e754b0834f4ebf8e18e6e49f8b498f1886725d52abeffb0fc29b84969	2025-11-18 19:14:01.214953+00	20251118000000_add_provisions	\N	\N	2025-11-18 19:14:01.185237+00	1
38e124bc-fd17-4a67-b88a-0401825d5ac6	e8c90591fd5392eec38fe7a78772ebed2b0e41ad12acd0e336da20b45fff375b	2025-12-03 16:37:34.251858+00	20251203163734_auth_system	\N	\N	2025-12-03 16:37:34.122862+00	1
9964c180-48bb-4398-9586-d74a243e20ed	45232cd4805df654ea4e961c3e5906f2e1ce262b8c93b92aa97aec56ca7f42b6	\N	20251210000000_add_budget_type_rppto	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20251210000000_add_budget_type_rppto\n\nDatabase error code: 42704\n\nDatabase error:\nERROR: constraint "ux_alloc_version_period_support_ceco" of relation "BudgetAllocation" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42704), message: "constraint \\"ux_alloc_version_period_support_ceco\\" of relation \\"BudgetAllocation\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(12276), routine: Some("ATExecDropConstraint") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20251210000000_add_budget_type_rppto"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20251210000000_add_budget_type_rppto"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	2025-12-11 02:41:52.381178+00	2025-12-11 02:40:22.870751+00	0
b5a29955-7f94-4e05-9584-cc5817df129a	9aad9652405b97ac91bfd8b32d6b4c0c0d3ed237e79b51e7fe777761e309aead	2025-12-11 02:42:01.276735+00	20251210000000_add_budget_type_rppto	\N	\N	2025-12-11 02:42:01.245343+00	1
bb52fc32-71d7-4c51-9b3a-46862100838d	9c584a2244ed3a55c3f9f94f0726342d8988344a54f051c7e60d1d6697ea7e11	2025-12-11 19:56:03.560045+00	20251211000000_fix_budget_constraint	\N	\N	2025-12-11 19:56:03.527936+00	1
97074b4c-2590-49ec-a32c-39d67ffa47c6	768a50da12543dd25edb160609ab6c304090c424374084079467b53b83bd62f0	2025-12-11 19:56:03.572837+00	20251211194720_drop_old_budget_constraint	\N	\N	2025-12-11 19:56:03.563498+00	1
52242a97-18a1-4fc7-818a-148b4f11947b	48ff6cc0cc7f7339fb41e7452d147c744445cc3dc333666524bbe53532fd59c3	2025-12-11 23:40:21.387311+00	20251211224547_add_permission_hierarchy	\N	\N	2025-12-11 23:40:21.364004+00	1
15e8cf0b-e4be-48af-add5-a9ba143e33fd	c7dc36e66f3058743489d1b21520600ffb96291714486ed61c6b9d72c2a6233c	2025-12-16 03:58:36.746673+00	20251215000000_add_facturas_submodulos	\N	\N	2025-12-16 03:58:36.72932+00	1
d85f9317-23bc-4d4a-b668-4542489086da	621d9e1a8dee026d47576006b0678b136aec65ffdeccc68d8fca68eee24e2316	2025-12-11 23:40:21.420152+00	20251211233432_add_oc_status_history	\N	\N	2025-12-11 23:40:21.390719+00	1
ef32b502-d08b-4db1-aff4-4388ceb4bfa5	0e2e20176d54a7bd4253c070afb9aa22a167041a068810295a4dd9451218091f	2025-12-17 15:18:48.830467+00	20251217145414_add_en_proceso_status	\N	\N	2025-12-17 15:18:48.811393+00	1
6364f1c0-b792-436b-9b03-0d4781f84f71	b8e3dbe3a5207f6b68f2130a09df715559d31babff7bf0599d20e3efc17f1d19	\N	20251218000000_approval_system	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20251218000000_approval_system\n\nDatabase error code: 55P04\n\nDatabase error:\nERROR: unsafe use of new value "APROBACION_HEAD" of enum type "InvStatus"\nHINT: New enum values must be committed before they can be used.\n\nPosition:\n[1m 24[0m VALUES ('INVOICE_VP_THRESHOLD', 'Umbral para aprobaci?n VP de facturas (monto con IGV en PEN)', 10000, true, NOW(), NOW())\n[1m 25[0m ON CONFLICT ("key") DO NOTHING;\n[1m 26[0m\n[1m 27[0m -- Migration: Convert existing EN_APROBACION invoices to APROBACION_HEAD\n[1m 28[0m -- This ensures existing invoices in approval flow continue in the new Head approval stage\n[1m 29[1;31m UPDATE "Invoice" SET "statusCurrent" = 'APROBACION_HEAD' WHERE "statusCurrent" = 'EN_APROBACION';[0m\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E55P04), message: "unsafe use of new value \\"APROBACION_HEAD\\" of enum type \\"InvStatus\\"", detail: None, hint: Some("New enum values must be committed before they can be used."), position: Some(Original(1353)), where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("enum.c"), line: Some(97), routine: Some("check_safe_enum_use") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20251218000000_approval_system"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20251218000000_approval_system"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	2025-12-18 15:00:26.969715+00	2025-12-18 14:58:45.93116+00	0
ee22886d-9093-405d-a8dc-da706d54bb01	9b7a357f5da0baaa141efcfc0e64b409610e7a6b5403cc6a8e001f125b178146	2025-12-18 15:00:36.78439+00	20251218000000_approval_system	\N	\N	2025-12-18 15:00:36.744614+00	1
6ba5b1cc-1081-4f43-a421-3afcaca0c834	c980e0727ece5cf8c1a486fe47b065b98dc896309c221c2dfd35d90d05d2521a	2025-12-18 20:59:39.466692+00	20251218100000_add_documents_system	\N	\N	2025-12-18 20:59:39.360285+00	1
02fa614f-a94f-445a-8511-019e65fd82f8	16d0df8ce9b64e23fd3273883303a3b1042b2331289e6424918d378f6487080b	2025-12-19 17:17:47.429945+00	20251219150646_add_proveedor_entity	\N	\N	2025-12-19 17:17:47.37777+00	1
9e4b3085-1d98-4365-a36c-99df4e349b49	6caa526cfb8d8a4408a142b56ec01491f1ef104f18db3b57e7704e54f9430e11	2025-12-26 17:43:45.461395+00	20251226170313_add_support_to_invoice	\N	\N	2025-12-26 17:43:45.448302+00	1
b223fbe1-d912-4da0-b8a4-0f660b3c3edb	bf1505964cbedf03815719f2c40067c08e6f6ca6c9f92b5f331c7a3478e86f45	2025-12-26 17:43:45.471885+00	20251226174330_add_proveedor_to_invoice	\N	\N	2025-12-26 17:43:45.463761+00	1
c0c7cd3c-6726-4212-b9df-bac08c9bd12c	99564ee19eaa78c292737bfc0ff191bde48ef9d75d20ca0b0f8c997a0e33127f	2026-01-08 20:53:01.319597+00	20260108000000_add_contratos_module	\N	\N	2026-01-08 20:53:01.271507+00	1
68a41edb-1fc7-447b-a36b-aad2bba7b798	a0908723feacc3dde694e08447926bcf31b3bfde9700047bb48717edb304976f	2026-01-08 20:53:01.342881+00	20260108010000_update_contratos_model	\N	\N	2026-01-08 20:53:01.322+00	1
\.


--
-- Name: AccountingClosure_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AccountingClosure_id_seq"', 1, false);


--
-- Name: ApprovalThreshold_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ApprovalThreshold_id_seq"', 1, true);


--
-- Name: Area_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Area_id_seq"', 59, true);


--
-- Name: Articulo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Articulo_id_seq"', 223, true);


--
-- Name: BudgetAllocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."BudgetAllocation_id_seq"', 3970, true);


--
-- Name: BudgetVersion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."BudgetVersion_id_seq"', 1, true);


--
-- Name: ControlLine_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ControlLine_id_seq"', 1, false);


--
-- Name: CostCenter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CostCenter_id_seq"', 39, true);


--
-- Name: Document_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Document_id_seq"', 2, true);


--
-- Name: ExchangeRate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ExchangeRate_id_seq"', 1, true);


--
-- Name: ExpenseConcept_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ExpenseConcept_id_seq"', 17, true);


--
-- Name: ExpensePackage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ExpensePackage_id_seq"', 13, true);


--
-- Name: FxReference_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."FxReference_id_seq"', 2, true);


--
-- Name: HistoricoContrato_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."HistoricoContrato_id_seq"', 1, true);


--
-- Name: InvoiceCostCenter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."InvoiceCostCenter_id_seq"', 21, true);


--
-- Name: InvoicePeriod_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."InvoicePeriod_id_seq"', 27, true);


--
-- Name: InvoiceStatusHistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."InvoiceStatusHistory_id_seq"', 29, true);


--
-- Name: Invoice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Invoice_id_seq"', 8, true);


--
-- Name: Management_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Management_id_seq"', 28, true);


--
-- Name: OCCostCenter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."OCCostCenter_id_seq"', 38, true);


--
-- Name: OCDocument_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."OCDocument_id_seq"', 2, true);


--
-- Name: OCStatusHistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."OCStatusHistory_id_seq"', 32, true);


--
-- Name: OC_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."OC_id_seq"', 16, true);


--
-- Name: Period_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Period_id_seq"', 168, true);


--
-- Name: Permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Permission_id_seq"', 108, true);


--
-- Name: Proveedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Proveedor_id_seq"', 1, true);


--
-- Name: Provision_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Provision_id_seq"', 2, true);


--
-- Name: PurchaseOrder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PurchaseOrder_id_seq"', 1, false);


--
-- Name: RecursoTercOC_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."RecursoTercOC_id_seq"', 1, false);


--
-- Name: RecursoTercerizado_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."RecursoTercerizado_id_seq"', 3, true);


--
-- Name: RolePermission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."RolePermission_id_seq"', 103, true);


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Role_id_seq"', 2, true);


--
-- Name: SupportCostCenter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."SupportCostCenter_id_seq"', 152, true);


--
-- Name: Support_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Support_id_seq"', 115, true);


--
-- Name: UserRole_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."UserRole_id_seq"', 2, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."User_id_seq"', 2, true);


--
-- Name: Vendor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Vendor_id_seq"', 1, false);


--
-- Name: AccountingClosure AccountingClosure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingClosure"
    ADD CONSTRAINT "AccountingClosure_pkey" PRIMARY KEY (id);


--
-- Name: ApprovalThreshold ApprovalThreshold_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalThreshold"
    ADD CONSTRAINT "ApprovalThreshold_pkey" PRIMARY KEY (id);


--
-- Name: Area Area_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Area"
    ADD CONSTRAINT "Area_pkey" PRIMARY KEY (id);


--
-- Name: Articulo Articulo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Articulo"
    ADD CONSTRAINT "Articulo_pkey" PRIMARY KEY (id);


--
-- Name: BudgetAllocation BudgetAllocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BudgetAllocation"
    ADD CONSTRAINT "BudgetAllocation_pkey" PRIMARY KEY (id);


--
-- Name: BudgetVersion BudgetVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BudgetVersion"
    ADD CONSTRAINT "BudgetVersion_pkey" PRIMARY KEY (id);


--
-- Name: ControlLine ControlLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ControlLine"
    ADD CONSTRAINT "ControlLine_pkey" PRIMARY KEY (id);


--
-- Name: CostCenter CostCenter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostCenter"
    ADD CONSTRAINT "CostCenter_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: ExchangeRate ExchangeRate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExchangeRate"
    ADD CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY (id);


--
-- Name: ExpenseConcept ExpenseConcept_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExpenseConcept"
    ADD CONSTRAINT "ExpenseConcept_pkey" PRIMARY KEY (id);


--
-- Name: ExpensePackage ExpensePackage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExpensePackage"
    ADD CONSTRAINT "ExpensePackage_pkey" PRIMARY KEY (id);


--
-- Name: FxReference FxReference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FxReference"
    ADD CONSTRAINT "FxReference_pkey" PRIMARY KEY (id);


--
-- Name: HistoricoContrato HistoricoContrato_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HistoricoContrato"
    ADD CONSTRAINT "HistoricoContrato_pkey" PRIMARY KEY (id);


--
-- Name: InvoiceCostCenter InvoiceCostCenter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceCostCenter"
    ADD CONSTRAINT "InvoiceCostCenter_pkey" PRIMARY KEY (id);


--
-- Name: InvoicePeriod InvoicePeriod_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoicePeriod"
    ADD CONSTRAINT "InvoicePeriod_pkey" PRIMARY KEY (id);


--
-- Name: InvoiceStatusHistory InvoiceStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceStatusHistory"
    ADD CONSTRAINT "InvoiceStatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: Management Management_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Management"
    ADD CONSTRAINT "Management_pkey" PRIMARY KEY (id);


--
-- Name: OCCostCenter OCCostCenter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCCostCenter"
    ADD CONSTRAINT "OCCostCenter_pkey" PRIMARY KEY (id);


--
-- Name: OCDocument OCDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCDocument"
    ADD CONSTRAINT "OCDocument_pkey" PRIMARY KEY (id);


--
-- Name: OCStatusHistory OCStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCStatusHistory"
    ADD CONSTRAINT "OCStatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: OC OC_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OC"
    ADD CONSTRAINT "OC_pkey" PRIMARY KEY (id);


--
-- Name: Period Period_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Period"
    ADD CONSTRAINT "Period_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: Proveedor Proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Proveedor"
    ADD CONSTRAINT "Proveedor_pkey" PRIMARY KEY (id);


--
-- Name: Provision Provision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Provision"
    ADD CONSTRAINT "Provision_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseOrder PurchaseOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY (id);


--
-- Name: RecursoTercOC RecursoTercOC_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecursoTercOC"
    ADD CONSTRAINT "RecursoTercOC_pkey" PRIMARY KEY (id);


--
-- Name: RecursoTercerizado RecursoTercerizado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecursoTercerizado"
    ADD CONSTRAINT "RecursoTercerizado_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: SupportCostCenter SupportCostCenter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SupportCostCenter"
    ADD CONSTRAINT "SupportCostCenter_pkey" PRIMARY KEY (id);


--
-- Name: Support Support_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Support"
    ADD CONSTRAINT "Support_name_key" UNIQUE (name);


--
-- Name: Support Support_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Support"
    ADD CONSTRAINT "Support_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vendor Vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AccountingClosure_periodId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AccountingClosure_periodId_key" ON public."AccountingClosure" USING btree ("periodId");


--
-- Name: ApprovalThreshold_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ApprovalThreshold_key_key" ON public."ApprovalThreshold" USING btree (key);


--
-- Name: Area_name_unique_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Area_name_unique_lower" ON public."Area" USING btree (lower(name));


--
-- Name: Articulo_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Articulo_code_key" ON public."Articulo" USING btree (code);


--
-- Name: Articulo_code_unique_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Articulo_code_unique_lower" ON public."Articulo" USING btree (lower(code));


--
-- Name: BudgetAllocation_versionId_periodId_supportId_costCenterId__key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BudgetAllocation_versionId_periodId_supportId_costCenterId__key" ON public."BudgetAllocation" USING btree ("versionId", "periodId", "supportId", "costCenterId", "budgetType");


--
-- Name: CostCenter_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CostCenter_code_key" ON public."CostCenter" USING btree (code);


--
-- Name: CostCenter_code_unique_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CostCenter_code_unique_lower" ON public."CostCenter" USING btree (lower(code));


--
-- Name: Document_driveFileId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Document_driveFileId_key" ON public."Document" USING btree ("driveFileId");


--
-- Name: ExchangeRate_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ExchangeRate_year_key" ON public."ExchangeRate" USING btree (year);


--
-- Name: ExpenseConcept_packageId_name_unique_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ExpenseConcept_packageId_name_unique_lower" ON public."ExpenseConcept" USING btree ("packageId", lower(name));


--
-- Name: ExpensePackage_name_unique_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ExpensePackage_name_unique_lower" ON public."ExpensePackage" USING btree (lower(name));


--
-- Name: InvoiceCostCenter_invoiceId_costCenterId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InvoiceCostCenter_invoiceId_costCenterId_key" ON public."InvoiceCostCenter" USING btree ("invoiceId", "costCenterId");


--
-- Name: InvoicePeriod_invoiceId_periodId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InvoicePeriod_invoiceId_periodId_key" ON public."InvoicePeriod" USING btree ("invoiceId", "periodId");


--
-- Name: Management_name_unique_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Management_name_unique_lower" ON public."Management" USING btree (lower(name));


--
-- Name: OCCostCenter_ocId_costCenterId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OCCostCenter_ocId_costCenterId_key" ON public."OCCostCenter" USING btree ("ocId", "costCenterId");


--
-- Name: OCDocument_ocId_documentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OCDocument_ocId_documentId_key" ON public."OCDocument" USING btree ("ocId", "documentId");


--
-- Name: OC_numeroOc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OC_numeroOc_key" ON public."OC" USING btree ("numeroOc");


--
-- Name: Permission_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_key_key" ON public."Permission" USING btree (key);


--
-- Name: Proveedor_ruc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Proveedor_ruc_key" ON public."Proveedor" USING btree (ruc);


--
-- Name: PurchaseOrder_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON public."PurchaseOrder" USING btree (number);


--
-- Name: RecursoTercOC_recursoTercId_ocId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RecursoTercOC_recursoTercId_ocId_key" ON public."RecursoTercOC" USING btree ("recursoTercId", "ocId");


--
-- Name: RolePermission_roleId_permissionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON public."RolePermission" USING btree ("roleId", "permissionId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: SupportCostCenter_supportId_costCenterId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SupportCostCenter_supportId_costCenterId_key" ON public."SupportCostCenter" USING btree ("supportId", "costCenterId");


--
-- Name: Support_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Support_code_key" ON public."Support" USING btree (code);


--
-- Name: Support_name_unique_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Support_name_unique_lower" ON public."Support" USING btree (lower(name));


--
-- Name: UserRole_userId_roleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON public."UserRole" USING btree ("userId", "roleId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_googleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_googleId_key" ON public."User" USING btree ("googleId");


--
-- Name: Vendor_taxId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Vendor_taxId_key" ON public."Vendor" USING btree ("taxId");


--
-- Name: ix_alloc_budget_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_alloc_budget_type ON public."BudgetAllocation" USING btree ("budgetType");


--
-- Name: ix_alloc_period_ceco; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_alloc_period_ceco ON public."BudgetAllocation" USING btree ("periodId", "costCenterId");


--
-- Name: ix_cl_accounting_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cl_accounting_period ON public."ControlLine" USING btree ("accountingPeriodId");


--
-- Name: ix_cl_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cl_period ON public."ControlLine" USING btree ("periodId");


--
-- Name: ix_cl_support_accounting_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cl_support_accounting_period ON public."ControlLine" USING btree ("supportId", "accountingPeriodId");


--
-- Name: ix_cl_type_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cl_type_state ON public."ControlLine" USING btree (type, state);


--
-- Name: ix_document_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_document_category ON public."Document" USING btree (category);


--
-- Name: ix_document_drive_file; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_document_drive_file ON public."Document" USING btree ("driveFileId");


--
-- Name: ix_historico_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_historico_periodo ON public."HistoricoContrato" USING btree ("fechaInicio", "fechaFin");


--
-- Name: ix_historico_recurso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_historico_recurso ON public."HistoricoContrato" USING btree ("recursoTercId");


--
-- Name: ix_invoice_oc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_invoice_oc ON public."Invoice" USING btree ("ocId");


--
-- Name: ix_invoicecostcenter_costcenter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_invoicecostcenter_costcenter ON public."InvoiceCostCenter" USING btree ("costCenterId");


--
-- Name: ix_invoicecostcenter_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_invoicecostcenter_invoice ON public."InvoiceCostCenter" USING btree ("invoiceId");


--
-- Name: ix_invoiceperiod_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_invoiceperiod_invoice ON public."InvoicePeriod" USING btree ("invoiceId");


--
-- Name: ix_invoiceperiod_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_invoiceperiod_period ON public."InvoicePeriod" USING btree ("periodId");


--
-- Name: ix_oc_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_estado ON public."OC" USING btree (estado);


--
-- Name: ix_oc_fecha_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_fecha_registro ON public."OC" USING btree ("fechaRegistro");


--
-- Name: ix_oc_proveedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_proveedor ON public."OC" USING btree ("proveedorId");


--
-- Name: ix_oc_support; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_support ON public."OC" USING btree ("supportId");


--
-- Name: ix_occostcenter_costcenter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_occostcenter_costcenter ON public."OCCostCenter" USING btree ("costCenterId");


--
-- Name: ix_occostcenter_oc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_occostcenter_oc ON public."OCCostCenter" USING btree ("ocId");


--
-- Name: ix_ocdocument_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ocdocument_document ON public."OCDocument" USING btree ("documentId");


--
-- Name: ix_ocdocument_oc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ocdocument_oc ON public."OCDocument" USING btree ("ocId");


--
-- Name: ix_ocstatushistory_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ocstatushistory_changed_at ON public."OCStatusHistory" USING btree ("changedAt");


--
-- Name: ix_ocstatushistory_oc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ocstatushistory_oc ON public."OCStatusHistory" USING btree ("ocId");


--
-- Name: ix_permission_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_permission_key ON public."Permission" USING btree (key);


--
-- Name: ix_permission_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_permission_module ON public."Permission" USING btree (module);


--
-- Name: ix_permission_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_permission_parent ON public."Permission" USING btree ("parentKey");


--
-- Name: ix_proveedor_razon_social; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_proveedor_razon_social ON public."Proveedor" USING btree ("razonSocial");


--
-- Name: ix_proveedor_ruc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_proveedor_ruc ON public."Proveedor" USING btree (ruc);


--
-- Name: ix_provision_periodo_contable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_provision_periodo_contable ON public."Provision" USING btree ("periodoContable");


--
-- Name: ix_provision_periodo_ppto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_provision_periodo_ppto ON public."Provision" USING btree ("periodoPpto");


--
-- Name: ix_provision_sustento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_provision_sustento ON public."Provision" USING btree ("sustentoId");


--
-- Name: ix_recurso_fecha_fin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recurso_fecha_fin ON public."RecursoTercerizado" USING btree ("fechaFin");


--
-- Name: ix_recurso_management; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recurso_management ON public."RecursoTercerizado" USING btree ("managementId");


--
-- Name: ix_recurso_proveedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recurso_proveedor ON public."RecursoTercerizado" USING btree ("proveedorId");


--
-- Name: ix_recurso_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recurso_status ON public."RecursoTercerizado" USING btree (status);


--
-- Name: ix_recurso_support; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recurso_support ON public."RecursoTercerizado" USING btree ("supportId");


--
-- Name: ix_recurso_terc_oc_oc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recurso_terc_oc_oc ON public."RecursoTercOC" USING btree ("ocId");


--
-- Name: ix_recurso_terc_oc_recurso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recurso_terc_oc_recurso ON public."RecursoTercOC" USING btree ("recursoTercId");


--
-- Name: ix_role_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_role_name ON public."Role" USING btree (name);


--
-- Name: ix_rolepermission_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rolepermission_permission ON public."RolePermission" USING btree ("permissionId");


--
-- Name: ix_rolepermission_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rolepermission_role ON public."RolePermission" USING btree ("roleId");


--
-- Name: ix_supportcostcenter_costcenter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_supportcostcenter_costcenter ON public."SupportCostCenter" USING btree ("costCenterId");


--
-- Name: ix_supportcostcenter_support; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_supportcostcenter_support ON public."SupportCostCenter" USING btree ("supportId");


--
-- Name: ix_user_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_email ON public."User" USING btree (email);


--
-- Name: ix_userrole_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_userrole_role ON public."UserRole" USING btree ("roleId");


--
-- Name: ix_userrole_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_userrole_user ON public."UserRole" USING btree ("userId");


--
-- Name: AccountingClosure AccountingClosure_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingClosure"
    ADD CONSTRAINT "AccountingClosure_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public."Period"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Area Area_managementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Area"
    ADD CONSTRAINT "Area_managementId_fkey" FOREIGN KEY ("managementId") REFERENCES public."Management"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BudgetAllocation BudgetAllocation_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BudgetAllocation"
    ADD CONSTRAINT "BudgetAllocation_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public."CostCenter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BudgetAllocation BudgetAllocation_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BudgetAllocation"
    ADD CONSTRAINT "BudgetAllocation_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public."Period"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BudgetAllocation BudgetAllocation_supportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BudgetAllocation"
    ADD CONSTRAINT "BudgetAllocation_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES public."Support"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BudgetAllocation BudgetAllocation_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BudgetAllocation"
    ADD CONSTRAINT "BudgetAllocation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."BudgetVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ControlLine ControlLine_accountingPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ControlLine"
    ADD CONSTRAINT "ControlLine_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES public."Period"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ControlLine ControlLine_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ControlLine"
    ADD CONSTRAINT "ControlLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ControlLine ControlLine_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ControlLine"
    ADD CONSTRAINT "ControlLine_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public."Period"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ControlLine ControlLine_poId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ControlLine"
    ADD CONSTRAINT "ControlLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES public."PurchaseOrder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ControlLine ControlLine_supportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ControlLine"
    ADD CONSTRAINT "ControlLine_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES public."Support"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExpenseConcept ExpenseConcept_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExpenseConcept"
    ADD CONSTRAINT "ExpenseConcept_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public."ExpensePackage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HistoricoContrato HistoricoContrato_recursoTercId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HistoricoContrato"
    ADD CONSTRAINT "HistoricoContrato_recursoTercId_fkey" FOREIGN KEY ("recursoTercId") REFERENCES public."RecursoTercerizado"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvoiceCostCenter InvoiceCostCenter_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceCostCenter"
    ADD CONSTRAINT "InvoiceCostCenter_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public."CostCenter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvoiceCostCenter InvoiceCostCenter_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceCostCenter"
    ADD CONSTRAINT "InvoiceCostCenter_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvoicePeriod InvoicePeriod_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoicePeriod"
    ADD CONSTRAINT "InvoicePeriod_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvoicePeriod InvoicePeriod_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoicePeriod"
    ADD CONSTRAINT "InvoicePeriod_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public."Period"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvoiceStatusHistory InvoiceStatusHistory_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceStatusHistory"
    ADD CONSTRAINT "InvoiceStatusHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_ocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_ocId_fkey" FOREIGN KEY ("ocId") REFERENCES public."OC"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_proveedorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES public."Proveedor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_supportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES public."Support"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OCCostCenter OCCostCenter_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCCostCenter"
    ADD CONSTRAINT "OCCostCenter_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public."CostCenter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OCCostCenter OCCostCenter_ocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCCostCenter"
    ADD CONSTRAINT "OCCostCenter_ocId_fkey" FOREIGN KEY ("ocId") REFERENCES public."OC"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OCDocument OCDocument_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCDocument"
    ADD CONSTRAINT "OCDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OCDocument OCDocument_ocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCDocument"
    ADD CONSTRAINT "OCDocument_ocId_fkey" FOREIGN KEY ("ocId") REFERENCES public."OC"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OCStatusHistory OCStatusHistory_ocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCStatusHistory"
    ADD CONSTRAINT "OCStatusHistory_ocId_fkey" FOREIGN KEY ("ocId") REFERENCES public."OC"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OC OC_articuloId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OC"
    ADD CONSTRAINT "OC_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES public."Articulo"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OC OC_budgetPeriodFromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OC"
    ADD CONSTRAINT "OC_budgetPeriodFromId_fkey" FOREIGN KEY ("budgetPeriodFromId") REFERENCES public."Period"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OC OC_budgetPeriodToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OC"
    ADD CONSTRAINT "OC_budgetPeriodToId_fkey" FOREIGN KEY ("budgetPeriodToId") REFERENCES public."Period"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OC OC_cecoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OC"
    ADD CONSTRAINT "OC_cecoId_fkey" FOREIGN KEY ("cecoId") REFERENCES public."CostCenter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OC OC_proveedorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OC"
    ADD CONSTRAINT "OC_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES public."Proveedor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OC OC_supportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OC"
    ADD CONSTRAINT "OC_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES public."Support"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Provision Provision_sustentoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Provision"
    ADD CONSTRAINT "Provision_sustentoId_fkey" FOREIGN KEY ("sustentoId") REFERENCES public."Support"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PurchaseOrder PurchaseOrder_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RecursoTercOC RecursoTercOC_ocId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecursoTercOC"
    ADD CONSTRAINT "RecursoTercOC_ocId_fkey" FOREIGN KEY ("ocId") REFERENCES public."OC"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecursoTercOC RecursoTercOC_recursoTercId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecursoTercOC"
    ADD CONSTRAINT "RecursoTercOC_recursoTercId_fkey" FOREIGN KEY ("recursoTercId") REFERENCES public."RecursoTercerizado"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecursoTercerizado RecursoTercerizado_managementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecursoTercerizado"
    ADD CONSTRAINT "RecursoTercerizado_managementId_fkey" FOREIGN KEY ("managementId") REFERENCES public."Management"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RecursoTercerizado RecursoTercerizado_proveedorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecursoTercerizado"
    ADD CONSTRAINT "RecursoTercerizado_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES public."Proveedor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RecursoTercerizado RecursoTercerizado_supportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecursoTercerizado"
    ADD CONSTRAINT "RecursoTercerizado_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES public."Support"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SupportCostCenter SupportCostCenter_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SupportCostCenter"
    ADD CONSTRAINT "SupportCostCenter_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public."CostCenter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SupportCostCenter SupportCostCenter_supportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SupportCostCenter"
    ADD CONSTRAINT "SupportCostCenter_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES public."Support"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Support Support_areaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Support"
    ADD CONSTRAINT "Support_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES public."Area"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Support Support_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Support"
    ADD CONSTRAINT "Support_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public."CostCenter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Support Support_expenseConceptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Support"
    ADD CONSTRAINT "Support_expenseConceptId_fkey" FOREIGN KEY ("expenseConceptId") REFERENCES public."ExpenseConcept"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Support Support_expensePackageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Support"
    ADD CONSTRAINT "Support_expensePackageId_fkey" FOREIGN KEY ("expensePackageId") REFERENCES public."ExpensePackage"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Support Support_managementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Support"
    ADD CONSTRAINT "Support_managementId_fkey" FOREIGN KEY ("managementId") REFERENCES public."Management"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserRole UserRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Wl6SgexsmYWbmvpZ2OOvpgPrfGLjVszoEAVmhr22s1ixiwi2hxn49gMGtfe7KFv


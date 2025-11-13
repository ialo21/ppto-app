import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";
import { toast } from "sonner";
import BulkUploader from "../components/BulkUploader";
import YearMonthPicker from "../components/YearMonthPicker";
import { useManagements, useAreas, useExpensePackages } from "../hooks/useCatalogData";
import { matchesSearch, debounce } from "../utils/searchUtils";
import { formatPeriodLabel } from "../utils/periodFormat";

type ViewMode = "monthly" | "annual";

interface BudgetRow {
  supportId: number;
  supportCode: string | null;
  supportName: string;
  costCenterId: number;
  costCenterCode: string;
  costCenterName: string | null;
  amountPen: number;
  management?: string;
  area?: string;
}

interface EditedValue {
  supportId: number;
  costCenterId: number;
  value: string;
  isValid: boolean;
  error?: string;
}

interface AnnualRow {
  supportId: number;
  supportName: string;
  supportCode: string | null;
  costCenterId: number;
  costCenterCode: string;
  costCenterName: string | null;
  managementName?: string;
  areaName?: string;
  months: Record<string, { periodId: number; isClosed: boolean; amountPen: number }>;
  totalYear: number;
}

interface AnnualEditedValue {
  supportId: number;
  costCenterId: number;
  periodId: number;
  month: string;
  value: string;
  isValid: boolean;
  error?: string;
}

const LOCAL_STORAGE_KEYS = {
  viewMode: "ppto.viewMode",
  year: "ppto.year",
  periodId: "ppto.periodId",
  onlyWithBudget: "ppto.onlyWithBudget"
};

export default function BudgetPage() {
  const queryClient = useQueryClient();
  
  // View mode (default: annual)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.viewMode);
    return (saved === "monthly" || saved === "annual") ? saved as ViewMode : "annual";
  });

  // Only show rows with budget > 0 (default: true)
  const [onlyWithBudget, setOnlyWithBudget] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.onlyWithBudget);
    return saved !== null ? saved === "true" : true;
  });

  // State
  const [selectedYear, setSelectedYear] = useState<number | undefined>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.year);
    return saved ? Number(saved) : new Date().getFullYear(); // Default: current year
  });
  
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.periodId);
    return saved ? Number(saved) : undefined;
  });
  
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [edited, setEdited] = useState<Map<string, EditedValue>>(new Map());
  const [annualEdited, setAnnualEdited] = useState<Map<string, AnnualEditedValue>>(new Map());
  const [sortBy, setSortBy] = useState<"support" | "ceco" | "amount">("support");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filters
  const [managementId, setManagementId] = useState<number | undefined>();
  const [areaId, setAreaId] = useState<number | undefined>();
  const [packageId, setPackageId] = useState<number | undefined>();
  const [conceptId, setConceptId] = useState<number | undefined>();

  // Bulk upload year (for CSV) - defaults to selectedYear
  const [bulkYear, setBulkYear] = useState<number | undefined>(selectedYear);
  const [bulkYearTouched, setBulkYearTouched] = useState(false);

  // Refs for keyboard navigation
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Refs for annual view two-table layout
  const leftTableBodyRef = useRef<HTMLTableSectionElement>(null);
  const rightTableBodyRef = useRef<HTMLTableSectionElement>(null);
  const leftTableHeaderRef = useRef<HTMLTableSectionElement>(null);
  const rightTableHeaderRef = useRef<HTMLTableSectionElement>(null);
  const rightScrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch catalog data
  const managementsQuery = useManagements();
  const areasQuery = useAreas();
  const packagesQuery = useExpensePackages();

  // Debounce search input
  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => setDebouncedSearch(value), 300),
    []
  );

  useEffect(() => {
    debouncedSetSearch(searchText);
  }, [searchText, debouncedSetSearch]);

  // Fetch available years
  const { data: yearsData } = useQuery({
    queryKey: ["periods-years"],
    queryFn: async () => (await api.get("/periods/years")).data
  });

  // Fetch periods for selected year (creates them if missing)
  const { data: periodsForYear = [], isLoading: isLoadingPeriods } = useQuery({
    queryKey: ["periods-for-year", selectedYear],
    queryFn: async () => {
      if (!selectedYear) return [];
      const response = await api.get("/periods", { params: { year: selectedYear } });
      return response.data;
    },
    enabled: !!selectedYear
  });

  const availableYears = useMemo(() => {
    if (!yearsData) return [];
    return yearsData.map((y: any) => y.year);
  }, [yearsData]);

  // Available areas filtered by management
  const availableAreas = useMemo(() => {
    if (!managementId || !areasQuery.data) return areasQuery.data || [];
    return areasQuery.data.filter((a: any) => a.managementId === managementId);
  }, [managementId, areasQuery.data]);

  // Available concepts filtered by package
  const availableConcepts = useMemo(() => {
    if (!packageId || !packagesQuery.data) return [];
    const pkg = packagesQuery.data.find((p: any) => p.id === packageId);
    return pkg?.concepts || [];
  }, [packageId, packagesQuery.data]);

  // No auto-select year from seed - already defaults to current year in useState

  // Auto-select period when switching to monthly view or when periods load
  useEffect(() => {
    if (periodsForYear.length > 0 && !selectedPeriodId && viewMode === "monthly") {
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const currentYear = new Date().getFullYear();
      
      // If viewing current year, try to select current month
      if (selectedYear === currentYear) {
        const currentMonthPeriod = periodsForYear.find((p: any) => p.month === currentMonth);
        
        if (currentMonthPeriod) {
          setSelectedPeriodId(currentMonthPeriod.id);
          localStorage.setItem(LOCAL_STORAGE_KEYS.periodId, String(currentMonthPeriod.id));
          return;
        }
      }
      
      // Otherwise select January (month 1) as default
      const januaryPeriod = periodsForYear.find((p: any) => p.month === 1);
      if (januaryPeriod) {
        setSelectedPeriodId(januaryPeriod.id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.periodId, String(januaryPeriod.id));
      }
    }
  }, [periodsForYear, selectedPeriodId, viewMode, selectedYear]);

  // Reset period and edits when year changes
  useEffect(() => {
    setSelectedPeriodId(undefined);
    setEdited(new Map());
    setAnnualEdited(new Map());
  }, [selectedYear]);

  // Persist view mode, year, period, and onlyWithBudget
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.viewMode, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (selectedYear) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.year, String(selectedYear));
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedPeriodId) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.periodId, String(selectedPeriodId));
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.onlyWithBudget, String(onlyWithBudget));
  }, [onlyWithBudget]);

  // Sync bulk year with selected year if not manually touched
  useEffect(() => {
    if (selectedYear && !bulkYearTouched) {
      setBulkYear(selectedYear);
    }
  }, [selectedYear, bulkYearTouched]);

  // Build query params for monthly view (without search, we'll filter client-side)
  const monthlyParams = useMemo(() => {
    const params: any = { periodId: selectedPeriodId };
    if (selectedYear) params.year = selectedYear; // Ensure year periods exist
    if (managementId) params.managementId = managementId;
    if (areaId) params.areaId = areaId;
    if (packageId) params.packageId = packageId;
    if (conceptId) params.conceptId = conceptId;
    return params;
  }, [selectedPeriodId, selectedYear, managementId, areaId, packageId, conceptId]);

  // Fetch monthly budget data
  const { data: budgetData, refetch: refetchMonthly } = useQuery({
    queryKey: ["budgets-detailed", monthlyParams],
    enabled: viewMode === "monthly" && !!selectedPeriodId,
    queryFn: async () => (await api.get("/budgets/detailed", { params: monthlyParams })).data
  });

  // Build query params for annual view (without search, we'll filter client-side)
  const annualParams = useMemo(() => {
    const params: any = { year: selectedYear };
    if (managementId) params.managementId = managementId;
    if (areaId) params.areaId = areaId;
    if (packageId) params.packageId = packageId;
    if (conceptId) params.conceptId = conceptId;
    return params;
  }, [selectedYear, managementId, areaId, packageId, conceptId]);

  // Fetch annual budget data
  const { data: annualData, refetch: refetchAnnual } = useQuery({
    queryKey: ["budgets-annual", annualParams],
    enabled: viewMode === "annual" && !!selectedYear,
    queryFn: async () => (await api.get("/budgets/annual", { params: annualParams })).data
  });

  // Monthly batch save
  const saveMonthlyMutation = useMutation({
    mutationFn: async () => {
      const items = Array.from(edited.values())
        .filter(e => e.isValid)
        .map(e => ({
          supportId: e.supportId,
          costCenterId: e.costCenterId,
          amountPen: parseFloat(e.value) || 0
        }));
      
      return (await api.put("/budgets/detailed/batch", {
        periodId: selectedPeriodId,
        items
      })).data;
    },
    onSuccess: () => {
      toast.success("Cambios guardados exitosamente");
      setEdited(new Map());
      queryClient.invalidateQueries({ queryKey: ["budgets-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["budgets-annual"] });
      refetchMonthly();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Error al guardar";
      toast.error(message);
    }
  });

  // Annual batch save
  const saveAnnualMutation = useMutation({
    mutationFn: async () => {
      const changes = Array.from(annualEdited.values())
        .filter(e => e.isValid)
        .map(e => ({
          supportId: e.supportId,
          costCenterId: e.costCenterId,
          periodId: e.periodId,
          amountPen: parseFloat(e.value) || 0
        }));
      
      return (await api.put("/budgets/annual/batch", { changes })).data;
    },
    onSuccess: (data) => {
      toast.success(`Cambios guardados: ${data.count} actualizados${data.skipped > 0 ? `, ${data.skipped} omitidos (períodos cerrados)` : ""}`);
      setAnnualEdited(new Map());
      queryClient.invalidateQueries({ queryKey: ["budgets-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["budgets-annual"] });
      refetchAnnual();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Error al guardar";
      toast.error(message);
    }
  });

  // Validation
  const validateAmount = (value: string): { isValid: boolean; error?: string } => {
    if (value === "") return { isValid: true };
    
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { isValid: false, error: "Debe ser un número válido" };
    }
    if (num < 0) {
      return { isValid: false, error: "No puede ser negativo" };
    }
    
    const parts = value.split(".");
    if (parts.length > 1 && parts[1].length > 2) {
      return { isValid: false, error: "Máximo 2 decimales" };
    }
    
    return { isValid: true };
  };

  // Monthly cell edit
  const handleMonthlyCellEdit = (supportId: number, costCenterId: number, value: string) => {
    const key = `${supportId}-${costCenterId}`;
    const validation = validateAmount(value);
    
    setEdited(prev => {
      const newMap = new Map(prev);
      newMap.set(key, {
        supportId,
        costCenterId,
        value,
        isValid: validation.isValid,
        error: validation.error
      });
      return newMap;
    });
  };

  // Annual cell edit
  const handleAnnualCellEdit = (supportId: number, costCenterId: number, periodId: number, month: string, value: string) => {
    const key = `${supportId}-${costCenterId}-${month}`;
    const validation = validateAmount(value);
    
    setAnnualEdited(prev => {
      const newMap = new Map(prev);
      newMap.set(key, {
        supportId,
        costCenterId,
        periodId,
        month,
        value,
        isValid: validation.isValid,
        error: validation.error
      });
      return newMap;
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentKey: string, rows: any[], rowIndex: number, cellType: "monthly" | "annual", monthIndex?: number) => {
    if (e.key === "Escape") {
      if (cellType === "monthly") {
        const row = rows[rowIndex];
        const key = `${row.supportId}-${row.costCenterId}`;
        setEdited(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
      } else {
        setAnnualEdited(prev => {
          const newMap = new Map(prev);
          newMap.delete(currentKey);
          return newMap;
        });
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const nextRowIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
      
      if (nextRowIndex >= 0 && nextRowIndex < rows.length) {
        const nextRow = rows[nextRowIndex];
        let nextKey: string;
        
        if (cellType === "monthly") {
          nextKey = `${nextRow.supportId}-${nextRow.costCenterId}`;
        } else {
          const months = Object.keys(nextRow.months).sort();
          const month = monthIndex !== undefined ? months[monthIndex] : months[0];
          nextKey = `${nextRow.supportId}-${nextRow.costCenterId}-${month}`;
        }
        
        const nextInput = inputRefs.current.get(nextKey);
        nextInput?.focus();
        nextInput?.select();
      }
    }
  };

  // Format number
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Handle vertical scroll synchronization for annual view two-table layout
  const handleRightTableScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const rightContainer = e.currentTarget;
    const leftBody = leftTableBodyRef.current;
    
    // Sync vertical scroll to left table body
    if (leftBody && leftBody.parentElement) {
      leftBody.parentElement.scrollTop = rightContainer.scrollTop;
    }
  }, []);

  // Get monthly cell value
  const getMonthlyCellValue = (row: BudgetRow): string => {
    const key = `${row.supportId}-${row.costCenterId}`;
    const editedVal = edited.get(key);
    if (editedVal !== undefined) {
      return editedVal.value;
    }
    return row.amountPen.toFixed(2);
  };

  // Get annual cell value
  const getAnnualCellValue = (row: AnnualRow, month: string): string => {
    const key = `${row.supportId}-${row.costCenterId}-${month}`;
    const editedVal = annualEdited.get(key);
    if (editedVal !== undefined) {
      return editedVal.value;
    }
    return row.months[month]?.amountPen?.toFixed(2) || "0.00";
  };

  // Check if cell is dirty
  const isCellDirty = (key: string): boolean => {
    return edited.has(key) || annualEdited.has(key);
  };

  // Filter and sort monthly rows (CLIENT-SIDE)
  const filteredAndSortedMonthlyRows = useMemo(() => {
    if (!budgetData?.rows) return [];
    let rows = [...budgetData.rows];
    
    // Apply "only with budget" filter
    if (onlyWithBudget) {
      rows = rows.filter((row: BudgetRow) => {
        const key = `${row.supportId}-${row.costCenterId}`;
        const editedVal = edited.get(key);
        const amount = editedVal?.isValid 
          ? (parseFloat(editedVal.value) || 0)
          : row.amountPen;
        return amount > 0;
      });
    }
    
    // Apply client-side search filter
    if (debouncedSearch.trim()) {
      rows = rows.filter((row: BudgetRow) => 
        matchesSearch(debouncedSearch, row.supportName, row.costCenterCode)
      );
    }
    
    // Sort
    rows.sort((a: BudgetRow, b: BudgetRow) => {
      let compareValue = 0;
      
      if (sortBy === "support") {
        compareValue = a.supportName.localeCompare(b.supportName);
      } else if (sortBy === "ceco") {
        compareValue = a.costCenterCode.localeCompare(b.costCenterCode);
      } else if (sortBy === "amount") {
        const aVal = parseFloat(getMonthlyCellValue(a)) || 0;
        const bVal = parseFloat(getMonthlyCellValue(b)) || 0;
        compareValue = aVal - bVal;
      }
      
      return sortOrder === "asc" ? compareValue : -compareValue;
    });
    
    return rows;
  }, [budgetData?.rows, sortBy, sortOrder, edited, debouncedSearch, onlyWithBudget]);

  // Filter annual rows (CLIENT-SIDE)
  const filteredAnnualRows = useMemo(() => {
    if (!annualData?.rows) return [];
    let rows = [...annualData.rows];
    
    // Apply "only with budget" filter (sum of 12 months > 0)
    if (onlyWithBudget) {
      rows = rows.filter((row: AnnualRow) => {
        let yearTotal = 0;
        Object.keys(row.months).forEach(month => {
          const key = `${row.supportId}-${row.costCenterId}-${month}`;
          const editedVal = annualEdited.get(key);
          const amount = editedVal?.isValid 
            ? (parseFloat(editedVal.value) || 0)
            : (row.months[month]?.amountPen || 0);
          yearTotal += amount;
        });
        return yearTotal > 0;
      });
    }
    
    // Apply client-side search filter
    if (debouncedSearch.trim()) {
      rows = rows.filter((row: AnnualRow) => 
        matchesSearch(debouncedSearch, row.supportName, row.costCenterCode)
      );
    }
    
    return rows;
  }, [annualData?.rows, debouncedSearch, onlyWithBudget, annualEdited]);

  // Calculate monthly totals
  const monthlyTotal = useMemo(() => {
    if (!filteredAndSortedMonthlyRows) return 0;
    return filteredAndSortedMonthlyRows.reduce((sum, row: BudgetRow) => {
      const key = `${row.supportId}-${row.costCenterId}`;
      const editedVal = edited.get(key);
      const amount = editedVal?.isValid 
        ? (parseFloat(editedVal.value) || 0)
        : row.amountPen;
      return sum + amount;
    }, 0);
  }, [filteredAndSortedMonthlyRows, edited]);

  // Calculate annual totals
  const annualTotals = useMemo(() => {
    if (!filteredAnnualRows || filteredAnnualRows.length === 0) return { monthTotals: {}, yearTotal: 0 };
    
    const monthTotals: Record<string, number> = {};
    let yearTotal = 0;
    
    filteredAnnualRows.forEach((row: AnnualRow) => {
      Object.entries(row.months).forEach(([month, data]) => {
        const key = `${row.supportId}-${row.costCenterId}-${month}`;
        const editedVal = annualEdited.get(key);
        const amount = editedVal?.isValid 
          ? (parseFloat(editedVal.value) || 0)
          : data.amountPen;
        
        monthTotals[month] = (monthTotals[month] || 0) + amount;
        yearTotal += amount;
      });
    });
    
    return { monthTotals, yearTotal };
  }, [filteredAnnualRows, annualEdited]);

  // Sync row heights between left and right tables in annual view
  // This runs after every render and also on window resize
  useLayoutEffect(() => {
    if (viewMode !== "annual" || !filteredAnnualRows || filteredAnnualRows.length === 0) return;

    const syncHeights = () => {
      const leftBody = leftTableBodyRef.current;
      const rightBody = rightTableBodyRef.current;
      const leftHeader = leftTableHeaderRef.current;
      const rightHeader = rightTableHeaderRef.current;

      if (!leftBody || !rightBody || !leftHeader || !rightHeader) return;

      // Sync header heights
      const leftHeaderRow = leftHeader.querySelector("tr");
      const rightHeaderRow = rightHeader.querySelector("tr");
      if (leftHeaderRow && rightHeaderRow) {
        // Reset heights first to get natural height
        leftHeaderRow.style.height = "";
        rightHeaderRow.style.height = "";
        const leftHeaderHeight = leftHeaderRow.getBoundingClientRect().height;
        const rightHeaderHeight = rightHeaderRow.getBoundingClientRect().height;
        const maxHeaderHeight = Math.max(leftHeaderHeight, rightHeaderHeight);
        leftHeaderRow.style.height = `${maxHeaderHeight}px`;
        rightHeaderRow.style.height = `${maxHeaderHeight}px`;
      }

      // Sync body row heights
      const leftRows = Array.from(leftBody.querySelectorAll("tr"));
      const rightRows = Array.from(rightBody.querySelectorAll("tr"));
      
      leftRows.forEach((leftRow, idx) => {
        const rightRow = rightRows[idx];
        if (rightRow) {
          // Reset heights first to get natural height
          leftRow.style.height = "";
          rightRow.style.height = "";
          const leftHeight = leftRow.getBoundingClientRect().height;
          const rightHeight = rightRow.getBoundingClientRect().height;
          const maxHeight = Math.max(leftHeight, rightHeight);
          leftRow.style.height = `${maxHeight}px`;
          rightRow.style.height = `${maxHeight}px`;
        }
      });
    };

    syncHeights();

    // Debounced resize handler to avoid excessive calculations
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(syncHeights, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [viewMode, filteredAnnualRows, annualEdited]); // Recalculate when data changes or edits are made

  const isClosed = budgetData?.isClosed || false;
  const hasMonthlyChanges = edited.size > 0 && Array.from(edited.values()).some(e => e.isValid);
  const hasAnnualChanges = annualEdited.size > 0 && Array.from(annualEdited.values()).some(e => e.isValid);
  const hasInvalidMonthlyChanges = Array.from(edited.values()).some(e => !e.isValid);
  const hasInvalidAnnualChanges = Array.from(annualEdited.values()).some(e => !e.isValid);

  const canSaveMonthly = hasMonthlyChanges && !hasInvalidMonthlyChanges && !isClosed && !saveMonthlyMutation.isPending;
  const canSaveAnnual = hasAnnualChanges && !hasInvalidAnnualChanges && !saveAnnualMutation.isPending;

  // Handle CSV upload success
  const handleCSVSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["budgets-detailed"] });
    queryClient.invalidateQueries({ queryKey: ["budgets-annual"] });
    
    // If bulk year matches selected year, refetch current views
    if (bulkYear === selectedYear) {
      refetchMonthly();
      refetchAnnual();
    }
    
    // Reset bulk year touched flag so it syncs again
    setBulkYearTouched(false);
  };

  // Empty state
  if (yearsData && yearsData.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">PPTO</h1>
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-slate-500 dark:text-slate-400">
                <p className="text-lg font-medium">No hay períodos configurados</p>
                <p className="text-sm mt-2">
                  Para comenzar a gestionar presupuestos, primero necesitas crear períodos.
                </p>
              </div>
              <div>
                <Button disabled>
                  Ir a gestión de períodos
                </Button>
                <p className="text-xs text-slate-400 mt-2">
                  (Funcionalidad pendiente de implementar)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">PPTO</h1>
        {budgetData?.period && viewMode === "monthly" && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {formatPeriodLabel(budgetData.period)}
            {isClosed && (
              <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Cerrado
              </span>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          {/* View Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "monthly" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setViewMode("monthly")}
              >
                Mensual
              </Button>
              <Button
                variant={viewMode === "annual" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setViewMode("annual")}
              >
                Anual
              </Button>
            </div>
            
            {/* Only with budget toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="onlyWithBudget"
                checked={onlyWithBudget}
                onChange={e => setOnlyWithBudget(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label htmlFor="onlyWithBudget" className="text-sm font-medium">
                {viewMode === "annual" 
                  ? "Mostrar solo sustentos con PPTO en el año" 
                  : "Mostrar solo sustentos con PPTO en el mes"}
              </label>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Year */}
            <div>
              <label className="block text-sm font-medium mb-1">Año</label>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={selectedYear ?? ""}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "") {
                    setSelectedYear(undefined);
                  } else {
                    const year = Number(val);
                    if (year >= 2000 && year <= 2100) {
                      setSelectedYear(year);
                    }
                  }
                }}
                placeholder="Ej: 2025"
              />
            </div>

            {/* Period (only for monthly) */}
            {viewMode === "monthly" && (
              <div>
                <label className="block text-sm font-medium mb-1">Período (Mes)</label>
                <YearMonthPicker
                  value={selectedPeriodId ?? null}
                  onChange={(period) => {
                    setSelectedPeriodId(period?.id);
                    setEdited(new Map());
                    if (period) {
                      localStorage.setItem(LOCAL_STORAGE_KEYS.periodId, String(period.id));
                    }
                  }}
                  periods={periodsForYear}
                  disabled={!selectedYear || isLoadingPeriods}
                  placeholder={
                    !selectedYear 
                      ? "Seleccione año primero" 
                      : isLoadingPeriods 
                        ? "Cargando períodos..."
                        : "Seleccione período..."
                  }
                  clearable={false}
                />
              </div>
            )}

            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-1">Buscar</label>
              <Input
                placeholder="Sustento o CECO..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                disabled={!selectedYear}
                title="Busca por nombre de Sustento o código de CECO (case-insensitive)"
              />
            </div>

            {/* Management */}
            <div>
              <label className="block text-sm font-medium mb-1">Gerencia</label>
              <Select
                value={managementId ?? ""}
                onChange={e => {
                  setManagementId(e.target.value ? Number(e.target.value) : undefined);
                  setAreaId(undefined);
                }}
              >
                <option value="">Todas</option>
                {(managementsQuery.data || []).map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium mb-1">Área</label>
              <Select
                value={areaId ?? ""}
                onChange={e => setAreaId(e.target.value ? Number(e.target.value) : undefined)}
                disabled={!managementId}
              >
                <option value="">Todas</option>
                {availableAreas.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </div>

            {/* Package */}
            <div>
              <label className="block text-sm font-medium mb-1">Paquete</label>
              <Select
                value={packageId ?? ""}
                onChange={e => {
                  setPackageId(e.target.value ? Number(e.target.value) : undefined);
                  setConceptId(undefined);
                }}
              >
                <option value="">Todos</option>
                {(packagesQuery.data || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>

            {/* Concept */}
            {packageId && (
              <div>
                <label className="block text-sm font-medium mb-1">Concepto</label>
                <Select
                  value={conceptId ?? ""}
                  onChange={e => setConceptId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!packageId}
                >
                  <option value="">Todos</option>
                  {availableConcepts.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
        </Select>
              </div>
            )}
          </div>

          {/* Actions */}
          {viewMode === "monthly" && selectedPeriodId && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => saveMonthlyMutation.mutate()}
                disabled={!canSaveMonthly}
              >
                {saveMonthlyMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
              
              {edited.size > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setEdited(new Map())}
                >
                  Descartar cambios
                </Button>
              )}
              
              {hasInvalidMonthlyChanges && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  Hay valores inválidos que deben corregirse
                </span>
              )}
            </div>
          )}

          {viewMode === "annual" && selectedYear && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => saveAnnualMutation.mutate()}
                disabled={!canSaveAnnual}
              >
                {saveAnnualMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
              
              {annualEdited.size > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setAnnualEdited(new Map())}
                >
                  Descartar cambios
                </Button>
              )}
              
              {hasInvalidAnnualChanges && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  Hay valores inválidos que deben corregirse
                </span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* MONTHLY VIEW */}
          {viewMode === "monthly" && (
            <>
              {!selectedPeriodId ? (
                <div className="text-center py-8 text-slate-500">
                  Seleccione un año y período para ver el presupuesto
                </div>
              ) : budgetData ? (
                <>
                  {/* Warnings */}
                  {budgetData.supportsWithoutCostCenters?.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                        ⚠️ Sustentos sin CECOs asociados
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-500">
                        Los siguientes sustentos no tienen centros de costo asignados:
                      </p>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-500 mt-1 ml-4 list-disc">
                        {budgetData.supportsWithoutCostCenters.slice(0, 5).map((s: any) => (
                          <li key={s.supportId}>{s.supportName} ({s.supportCode || "sin código"})</li>
                        ))}
                        {budgetData.supportsWithoutCostCenters.length > 5 && (
                          <li>... y {budgetData.supportsWithoutCostCenters.length - 5} más</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {filteredAndSortedMonthlyRows.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      {debouncedSearch ? 
                        `No hay datos para "${debouncedSearch}" con los filtros aplicados` :
                        "No hay datos para mostrar con los filtros aplicados"
                      }
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                        Mostrando {filteredAndSortedMonthlyRows.length} fila{filteredAndSortedMonthlyRows.length !== 1 ? 's' : ''}
                        {debouncedSearch && ` para "${debouncedSearch}"`}
                      </div>
                      <div className="overflow-x-auto">
          <Table>
                          <thead>
                            <tr>
                              <Th 
                                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => {
                                  if (sortBy === "support") {
                                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setSortBy("support");
                                    setSortOrder("asc");
                                  }
                                }}
                              >
                                Sustento {sortBy === "support" && (sortOrder === "asc" ? "↑" : "↓")}
                              </Th>
                              <Th 
                                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => {
                                  if (sortBy === "ceco") {
                                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setSortBy("ceco");
                                    setSortOrder("asc");
                                  }
                                }}
                              >
                                CECO {sortBy === "ceco" && (sortOrder === "asc" ? "↑" : "↓")}
                              </Th>
                              <Th 
                                className="text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => {
                                  if (sortBy === "amount") {
                                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setSortBy("amount");
                                    setSortOrder("asc");
                                  }
                                }}
                              >
                                Monto (PEN) {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                              </Th>
                              <Th>Gerencia</Th>
                              <Th>Área</Th>
                            </tr>
                          </thead>
            <tbody>
                            {filteredAndSortedMonthlyRows.map((row: BudgetRow, idx: number) => {
                              const key = `${row.supportId}-${row.costCenterId}`;
                              const validation = edited.get(key);
                              const isDirty = isCellDirty(key);
                              const hasError = validation && !validation.isValid;
                              
                              return (
                                <tr 
                                  key={key}
                                  className={isDirty ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}
                                >
                                  <Td>
                                    <div className="font-medium">{row.supportName}</div>
                                    {row.supportCode && (
                                      <div className="text-xs text-slate-500">{row.supportCode}</div>
                                    )}
                                  </Td>
                                  <Td>
                                    <div className="font-medium">{row.costCenterCode}</div>
                                    {row.costCenterName && (
                                      <div className="text-xs text-slate-500">{row.costCenterName}</div>
                                    )}
                                  </Td>
                                  <Td>
                                    <div className="flex flex-col gap-1">
                                      <Input
                                        ref={el => el && inputRefs.current.set(key, el)}
                                        type="text"
                                        value={getMonthlyCellValue(row)}
                                        onChange={e => handleMonthlyCellEdit(row.supportId, row.costCenterId, e.target.value)}
                                        onKeyDown={e => handleKeyDown(e, key, filteredAndSortedMonthlyRows, idx, "monthly")}
                                        disabled={isClosed}
                                        className={`text-right ${hasError ? "border-red-500" : ""}`}
                                        style={{ width: "140px" }}
                                      />
                                      {hasError && validation?.error && (
                                        <span className="text-xs text-red-600 dark:text-red-400">
                                          {validation.error}
                                        </span>
                                      )}
                                    </div>
                                  </Td>
                                  <Td>{row.management || "-"}</Td>
                                  <Td>{row.area || "-"}</Td>
                                </tr>
                              );
              })}
            </tbody>
                          <tfoot className="bg-slate-50 dark:bg-slate-900 font-semibold">
                            <tr>
                              <Td colSpan={2} className="text-right">Total:</Td>
                              <Td className="text-right">{formatNumber(monthlyTotal)}</Td>
                              <Td colSpan={2}></Td>
                            </tr>
                          </tfoot>
          </Table>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </>
          )}

          {/* ANNUAL VIEW */}
          {viewMode === "annual" && selectedYear && annualData && (
            <>
              {filteredAnnualRows.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {debouncedSearch ? 
                    `No hay datos para "${debouncedSearch}" con los filtros aplicados` :
                    "No hay datos para mostrar con los filtros aplicados"
                  }
                </div>
              ) : (
                <>
                  <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                    Mostrando {filteredAnnualRows.length} fila{filteredAnnualRows.length !== 1 ? 's' : ''}
                    {debouncedSearch && ` para "${debouncedSearch}"`}
                  </div>
                  {/* Two-table layout: Left table (fixed) + Right table (scrollable) */}
                  <div style={{ display: "flex", gap: "0", width: "100%" }}>
                    {/* LEFT TABLE: Sustento y CECO (Fixed columns) */}
                    <div style={{ flexShrink: 0, overflowY: "hidden", overflowX: "hidden" }}>
                      <Table style={{ tableLayout: "fixed", width: "390px", borderCollapse: "collapse" }}>
                        <thead ref={leftTableHeaderRef}>
                          <tr>
                            <Th style={{ width: "260px" }}>Sustento</Th>
                            <Th style={{ width: "130px" }}>CECO</Th>
                          </tr>
                        </thead>
                        <tbody ref={leftTableBodyRef}>
                          {filteredAnnualRows.map((row: AnnualRow) => (
                            <tr key={`left-${row.supportId}-${row.costCenterId}`}>
                              <Td>
                                <div className="font-medium">{row.supportName}</div>
                                {row.supportCode && (
                                  <div className="text-xs text-slate-500">{row.supportCode}</div>
                                )}
                              </Td>
                              <Td>
                                <div className="font-medium">{row.costCenterCode}</div>
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-900 font-semibold">
                          <tr>
                            <Td colSpan={2} className="text-right">Total por mes:</Td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    {/* RIGHT TABLE: Months + Total (Scrollable horizontally) */}
                    <div 
                      ref={rightScrollContainerRef}
                      onScroll={handleRightTableScroll}
                      style={{ 
                        flexGrow: 1, 
                        overflowX: "auto", 
                        overflowY: "hidden"
                      }}
                    >
                      <Table style={{ tableLayout: "fixed", borderCollapse: "collapse", minWidth: "100%" }}>
                        <thead ref={rightTableHeaderRef}>
                          <tr>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Ene</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Feb</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Mar</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Abr</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>May</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Jun</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Jul</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Ago</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Sep</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Oct</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Nov</Th>
                            <Th style={{ width: "150px", minWidth: "150px" }}>Dic</Th>
                            <Th className="bg-slate-100 dark:bg-slate-800" style={{ width: "150px", minWidth: "150px" }}>Total</Th>
                          </tr>
                        </thead>
                        <tbody ref={rightTableBodyRef}>
                          {filteredAnnualRows.map((row: AnnualRow, rowIdx: number) => {
                            const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
                            
                            // Calculate row total with edits
                            let rowTotal = 0;
                            months.forEach(month => {
                              const key = `${row.supportId}-${row.costCenterId}-${month}`;
                              const editedVal = annualEdited.get(key);
                              const amount = editedVal?.isValid 
                                ? (parseFloat(editedVal.value) || 0)
                                : (row.months[month]?.amountPen || 0);
                              rowTotal += amount;
                            });

                            return (
                              <tr key={`right-${row.supportId}-${row.costCenterId}`}>
                                {months.map((month, monthIdx) => {
                                  const monthData = row.months[month];
                                  const key = `${row.supportId}-${row.costCenterId}-${month}`;
                                  const validation = annualEdited.get(key);
                                  const isDirty = isCellDirty(key);
                                  const hasError = validation && !validation.isValid;
                                  const isClosed = monthData?.isClosed || false;

                                  return (
                                    <Td key={month} className={isDirty ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
                                      {monthData ? (
                                        <div className="flex flex-col gap-1">
                                          <Input
                                            ref={el => el && inputRefs.current.set(key, el)}
                                            type="text"
                                            value={getAnnualCellValue(row, month)}
                                            onChange={e => handleAnnualCellEdit(row.supportId, row.costCenterId, monthData.periodId, month, e.target.value)}
                                            onKeyDown={e => handleKeyDown(e, key, filteredAnnualRows, rowIdx, "annual", monthIdx)}
                                            disabled={isClosed}
                                            title={isClosed ? "Período cerrado" : ""}
                                            className={`text-right w-full ${hasError ? "border-red-500" : ""} ${isClosed ? "bg-slate-100 dark:bg-slate-800 cursor-not-allowed" : ""}`}
                                          />
                                          {hasError && validation?.error && (
                                            <span className="text-xs text-red-600 dark:text-red-400">
                                              {validation.error}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-400">N/A</span>
                                      )}
                                    </Td>
                                  );
                                })}
                                <Td className="text-right font-semibold bg-slate-100 dark:bg-slate-800">
                                  {formatNumber(rowTotal)}
                                </Td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-900 font-semibold">
                          <tr>
                            {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(month => (
                              <Td key={month} className="text-right">
                                {formatNumber(annualTotals.monthTotals[month] || 0)}
                              </Td>
                            ))}
                            <Td className="text-right bg-slate-200 dark:bg-slate-700">
                              {formatNumber(annualTotals.yearTotal)}
                            </Td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* CSV UPLOAD */}
      {selectedYear && (
        <>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Configuración de Carga Masiva</h2>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <label className="block text-sm font-medium mb-1">Año de carga (destino CSV)</label>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={bulkYear ?? ""}
                  onChange={e => {
                    const val = e.target.value;
                    setBulkYearTouched(true);
                    if (val === "") {
                      setBulkYear(undefined);
                    } else {
                      const year = Number(val);
                      if (year >= 2000 && year <= 2100) {
                        setBulkYear(year);
                      }
                    }
                  }}
                  placeholder="Ej: 2025"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Por defecto usa el año seleccionado arriba. Puedes cambiarlo para cargar datos en otro año.
                </p>
              </div>
            </CardContent>
          </Card>

          {bulkYear && bulkYear >= 2000 && bulkYear <= 2100 && (
            <BulkUploader
              title="Carga Masiva de Presupuesto (CSV)"
              description={`Importa presupuesto anual completo (12 meses) para el año ${bulkYear} desde un archivo CSV.`}
              templateUrl="/bulk/template/budget"
              uploadUrl="/bulk/catalogs"
              templateFilename={`budget_template_${bulkYear}.csv`}
              additionalParams={{ type: "budget", year: bulkYear }}
              onSuccess={handleCSVSuccess}
              showOverwriteBlanks={true}
            />
          )}
        </>
      )}
    </div>
  );
}


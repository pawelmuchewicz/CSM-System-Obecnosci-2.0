import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/loading-spinner";
import { CalendarIcon, DownloadIcon, BarChart3Icon, UsersIcon } from "lucide-react";
import { fetchGroups, fetchAttendanceReport, getExportUrl } from "@/lib/api";
import { StatsCharts } from "@/components/stats-charts";
import type { AttendanceReportFilters } from "@shared/schema";

export function ReportsPage() {
  // Set default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const [filters, setFilters] = useState<AttendanceReportFilters>({
    groupIds: ['TTI'], // Default to TTI group
    dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
    dateTo: today.toISOString().split('T')[0],
    status: 'all'
  });

  const { data: groupsData } = useQuery({
    queryKey: ['/api/groups'],
    queryFn: fetchGroups,
  });

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['/api/reports/attendance', filters],
    queryFn: () => fetchAttendanceReport(filters),
    enabled: !!(filters.dateFrom && filters.dateTo),
    retry: 1,
  });

  const groups = groupsData?.groups || [];
  const report = reportData || { items: [], studentStats: [], groupStats: [], totalStats: { totalSessions: 0, presentSessions: 0, absentSessions: 0, attendancePercentage: 0 } };

  const handleDownload = (type: 'csv' | 'pdf') => {
    const url = getExportUrl(type, filters);
    window.open(url, '_blank');
  };

  const updateFilter = (key: keyof AttendanceReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Raporty obecności</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Analizuj obecność studentów i generuj raporty
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Filtry raportu
          </CardTitle>
          <CardDescription>
            Wybierz kryteria filtrowania dla raportu obecności
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Data od</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                data-testid="input-date-from"
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label htmlFor="dateTo">Data do</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                data-testid="input-date-to"
              />
            </div>

            {/* Group Filter */}
            <div className="space-y-2">
              <Label htmlFor="groupFilter">Grupa</Label>
              <Select 
                value={filters.groupIds?.[0] || ''} 
                onValueChange={(value) => updateFilter('groupIds', value ? [value] : [])}
              >
                <SelectTrigger data-testid="select-group">
                  <SelectValue placeholder="Wybierz grupę" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => updateFilter('status', value as 'obecny' | 'nieobecny' | 'wypisani' | 'all')}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="obecny">Obecni</SelectItem>
                  <SelectItem value="nieobecny">Nieobecni</SelectItem>
                  <SelectItem value="wypisani">Wypisani</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => handleDownload('csv')}
              disabled={!reportData}
              data-testid="button-export-csv"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Eksportuj CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleDownload('pdf')}
              disabled={!reportData}
              data-testid="button-export-pdf"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Eksportuj PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Łączna obecność</p>
                  <p className="text-3xl font-bold">{report.totalStats.attendancePercentage}%</p>
                </div>
                <BarChart3Icon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Obecni</p>
                  <p className="text-3xl font-bold text-green-600">{report.totalStats.presentSessions}</p>
                </div>
                <UsersIcon className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nieobecni</p>
                  <p className="text-3xl font-bold text-red-600">{report.totalStats.absentSessions}</p>
                </div>
                <UsersIcon className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {reportData && report.groupStats.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Wykresy i analiza</h2>
          </div>
          <StatsCharts 
            groupStats={report.groupStats} 
            studentStats={report.studentStats} 
          />
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wyniki raportu</CardTitle>
          <CardDescription>
            {isLoading && "Ładowanie danych..."}
            {error && "Błąd podczas ładowania danych"}
            {reportData && `Znaleziono ${report.items.length} rekordów`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <LoadingSpinner size="sm" text="Ładowanie raportu..." />}

          {error && (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                Błąd podczas ładowania raportu. Część grup może być niedostępna.
              </div>
              <div className="text-sm text-muted-foreground">
                Spróbuj wybrać konkretną grupę lub zmień zakres dat.
              </div>
            </div>
          )}

          {reportData && report.items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak danych dla wybranych filtrów. Zmień kryteria wyszukiwania.
            </div>
          )}

          {reportData && report.items.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-auto">Student</TableHead>
                    <TableHead className="hidden md:table-cell w-32">Grupa</TableHead>
                    <TableHead className="w-24 md:w-32">Data</TableHead>
                    <TableHead className="w-24 md:w-32">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Notatki</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.items.map((item, index) => (
                    <TableRow key={`${item.student_id}-${item.date}`} data-testid={`row-report-${index}`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{item.student_name}</span>
                          <span className="md:hidden text-xs text-muted-foreground">{item.group_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{item.group_name}</TableCell>
                      <TableCell className="text-xs md:text-sm">{new Date(item.date).toLocaleDateString('pl-PL')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'obecny' ? 'default' :
                            item.status === 'nieobecny' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs md:text-sm"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {item.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
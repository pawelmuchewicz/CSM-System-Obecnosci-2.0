import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toolbar } from "@/components/toolbar";
import { AttendanceTable } from "@/components/attendance-table";
import { fetchGroups, fetchStudents, fetchAttendance, saveAttendance, invalidateAttendanceQueries } from "@/lib/api";
import type { AttendanceItem } from "@shared/schema";

export default function AttendancePage() {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendance, setAttendance] = useState<Map<string, AttendanceItem>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);
  const [conflicts, setConflicts] = useState<AttendanceItem[]>([]);

  // Fetch groups
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/groups'],
    queryFn: fetchGroups,
  });

  // Fetch students for selected group
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students', selectedGroup],
    queryFn: () => fetchStudents(selectedGroup),
    enabled: !!selectedGroup,
  });

  // Fetch attendance for selected group and date
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['/api/attendance', selectedGroup, selectedDate],
    queryFn: () => fetchAttendance(selectedGroup, selectedDate),
    enabled: !!selectedGroup && !!selectedDate,
  });

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: saveAttendance,
    onSuccess: (data) => {
      if (data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        toast({
          title: "Wykryto konflikty",
          description: `${data.conflicts.length} wpis(ów) zostało zmienionych przez innego użytkownika.`,
          variant: "destructive",
        });
        // Refresh attendance data to get latest state
        invalidateAttendanceQueries(selectedGroup, selectedDate);
      } else {
        setHasChanges(false);
        setConflicts([]);
        toast({
          title: "Sukces",
          description: "Frekwencja została zapisana pomyślnie!",
        });
        // Update local attendance state with new timestamps
        const updatedAttendance = new Map(attendance);
        data.updated.forEach(item => {
          updatedAttendance.set(item.student_id, item);
        });
        setAttendance(updatedAttendance);
      }
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: `Nie udało się zapisać frekwencji: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update attendance when data is fetched
  useEffect(() => {
    if (attendanceData?.items) {
      const newAttendance = new Map<string, AttendanceItem>();
      attendanceData.items.forEach(item => {
        newAttendance.set(item.student_id, item);
      });
      setAttendance(newAttendance);
      setHasChanges(false);
      setConflicts([]);
    }
  }, [attendanceData]);

  // Set first group as default when groups load
  useEffect(() => {
    if (groupsData?.groups && groupsData.groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groupsData.groups[0].id);
    }
  }, [groupsData, selectedGroup]);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    setHasChanges(false);
    setConflicts([]);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setHasChanges(false);
    setConflicts([]);
  };

  const handleAttendanceChange = (studentId: string, status: 'obecny' | 'nieobecny') => {
    const currentItem = attendance.get(studentId);
    const newAttendance = new Map(attendance);
    newAttendance.set(studentId, {
      student_id: studentId,
      status,
      updated_at: currentItem?.updated_at // Keep the current timestamp for conflict detection
    });
    setAttendance(newAttendance);
    setHasChanges(true);
  };

  const handleToggleAllAttendance = () => {
    if (!studentsData?.students) return;
    
    // Check if all students are present
    const allPresent = studentsData.students.every(student => {
      const studentAttendance = attendance.get(student.id);
      return studentAttendance?.status === 'obecny';
    });
    
    // Toggle: if all present, mark all absent; if not all present, mark all present
    const newStatus = allPresent ? 'nieobecny' : 'obecny';
    
    const newAttendance = new Map(attendance);
    studentsData.students.forEach(student => {
      const currentItem = attendance.get(student.id);
      newAttendance.set(student.id, {
        student_id: student.id,
        status: newStatus,
        updated_at: currentItem?.updated_at
      });
    });
    setAttendance(newAttendance);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedGroup || !selectedDate) return;

    const items = Array.from(attendance.values());
    saveAttendanceMutation.mutate({
      groupId: selectedGroup,
      date: selectedDate,
      items
    });
  };

  const groups = groupsData?.groups || [];
  const students = studentsData?.students || [];
  const isLoading = groupsLoading || studentsLoading || attendanceLoading;
  
  // Check if all students are present
  const allStudentsPresent = students.length > 0 && students.every(student => {
    const studentAttendance = attendance.get(student.id);
    return studentAttendance?.status === 'obecny';
  });

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="text-primary text-2xl" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900">Attendance</h1>
                <p className="text-sm text-gray-500">System Frekwencji</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                <span>Nauczyciel</span>
              </div>
              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                <Users className="text-primary text-sm" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Toolbar
          groups={groups}
          selectedGroup={selectedGroup}
          onGroupChange={handleGroupChange}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          studentCount={students.length}
          onToggleAllAttendance={handleToggleAllAttendance}
          allStudentsPresent={allStudentsPresent}
          onSave={handleSave}
          hasChanges={hasChanges}
          isSaving={saveAttendanceMutation.isPending}
        />

        {/* Conflict Banner */}
        {conflicts.length > 0 && (
          <Alert className="mb-6 border-l-4 border-yellow-400 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-700">
              <strong>Wykryto konflikty:</strong> Niektóre wpisy zostały zmienione przez innego użytkownika. 
              Odśwież dane aby zobaczyć najnowszy stan.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Ładowanie...</p>
          </div>
        )}

        {/* Students Table */}
        {!isLoading && (
          <AttendanceTable
            students={students}
            attendance={attendance}
            onAttendanceChange={handleAttendanceChange}
            selectedDate={selectedDate}
            selectedGroup={selectedGroup}
            selectedGroupName={groupsData?.groups.find(g => g.id === selectedGroup)?.name || selectedGroup}
            onNotesUpdate={(studentId, notes) => {
              const currentItem = attendance.get(studentId);
              if (currentItem) {
                const newAttendance = new Map(attendance);
                newAttendance.set(studentId, { ...currentItem, notes });
                setAttendance(newAttendance);
                setHasChanges(true);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

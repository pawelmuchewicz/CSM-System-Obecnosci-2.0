import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCheck, Save, Users, Eye, EyeOff } from "lucide-react";
import type { Group } from "@shared/schema";

interface ToolbarProps {
  groups: Group[];
  selectedGroup: string;
  onGroupChange: (groupId: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  studentCount: number;
  onToggleAllAttendance: () => void;
  allStudentsPresent: boolean;
  onSave: () => void;
  hasChanges: boolean;
  isSaving: boolean;
  showInactive: boolean;
  onShowInactiveChange: (show: boolean) => void;
}

export function Toolbar({
  groups,
  selectedGroup,
  onGroupChange,
  selectedDate,
  onDateChange,
  studentCount,
  onToggleAllAttendance,
  allStudentsPresent,
  onSave,
  hasChanges,
  isSaving,
  showInactive,
  onShowInactiveChange
}: ToolbarProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 mb-6">
      {/* Pierwszy rząd - główne kontrolki */}
      <div className="flex flex-col sm:flex-row sm:items-end space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
        {/* Group Selector */}
        <div className="flex-1 min-w-0">
          <Label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-1">
            Grupa
          </Label>
          <Select 
            value={selectedGroup} 
            onValueChange={onGroupChange}
            data-testid="select-group"
          >
            <SelectTrigger className="w-full shadow-sm border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" id="group-select">
              <SelectValue placeholder="Wybierz grupę..." />
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

        {/* Date Picker */}
        <div className="flex-1 min-w-0">
          <Label htmlFor="date-picker" className="block text-sm font-medium text-gray-700 mb-1">
            Data
          </Label>
          <Input
            type="date"
            id="date-picker"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full shadow-sm border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="input-date"
          />
        </div>
      </div>

      {/* Drugi rząd - statystyki i opcje */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          {/* Student Count */}
          <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md shadow-sm border border-gray-200">
            <Users className="w-4 h-4 mr-1 flex-shrink-0" />
            <span data-testid="text-student-count">{studentCount}</span> uczniów
          </div>

          {/* Show Inactive Toggle */}
          <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-md shadow-sm border border-gray-200">
            {showInactive ? (
              <Eye className="w-4 h-4 text-gray-600 flex-shrink-0" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-600 flex-shrink-0" />
            )}
            <Switch
              checked={showInactive}
              onCheckedChange={onShowInactiveChange}
              data-testid="switch-show-inactive"
            />
            <span className="text-sm text-gray-600 whitespace-nowrap">
              Nieaktywni
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          {/* Toggle All Attendance Button */}
          <Button
            type="button"
            variant="outline"
            onClick={onToggleAllAttendance}
            disabled={!selectedGroup || studentCount === 0}
            className="w-full sm:w-auto text-sm border-2 border-blue-500 text-blue-700 hover:bg-blue-50 hover:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white"
            data-testid="button-toggle-all"
          >
            <CheckCheck className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">
              {allStudentsPresent ? 'Wszyscy nieobecni' : 'Wszyscy obecni'}
            </span>
            <span className="sm:hidden">
              {allStudentsPresent ? 'Nieobecni' : 'Obecni'}
            </span>
          </Button>

          {/* Save Button */}
          <Button
            type="button"
            onClick={onSave}
            disabled={!hasChanges || isSaving || !selectedGroup}
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto text-sm"
            data-testid="button-save"
          >
            <Save className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">
              {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
            </span>
            <span className="sm:hidden">
              {isSaving ? "Zapisuje..." : "Zapisz"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

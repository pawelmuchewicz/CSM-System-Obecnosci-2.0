import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCheck, Save, Users } from "lucide-react";
import type { Group } from "@shared/schema";

interface ToolbarProps {
  groups: Group[];
  selectedGroup: string;
  onGroupChange: (groupId: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  studentCount: number;
  onSelectAllPresent: () => void;
  onSave: () => void;
  hasChanges: boolean;
  isSaving: boolean;
}

export function Toolbar({
  groups,
  selectedGroup,
  onGroupChange,
  selectedDate,
  onDateChange,
  studentCount,
  onSelectAllPresent,
  onSave,
  hasChanges,
  isSaving
}: ToolbarProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Group Selector */}
          <div className="flex-shrink-0">
            <Label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-1">
              Grupa
            </Label>
            <Select 
              value={selectedGroup} 
              onValueChange={onGroupChange}
              data-testid="select-group"
            >
              <SelectTrigger className="w-full sm:w-48 shadow-sm border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" id="group-select">
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
          <div className="flex-shrink-0">
            <Label htmlFor="date-picker" className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </Label>
            <Input
              type="date"
              id="date-picker"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full sm:w-48 shadow-sm border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="input-date"
            />
          </div>

          {/* Student Count */}
          <div className="flex items-center text-sm text-gray-600 pt-6 bg-gray-50 px-3 py-2 rounded-md shadow-sm border border-gray-200">
            <Users className="w-4 h-4 mr-1" />
            <span data-testid="text-student-count">{studentCount}</span> uczniów
          </div>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          {/* Select All Button */}
          <Button
            type="button"
            variant="outline"
            onClick={onSelectAllPresent}
            disabled={!selectedGroup || studentCount === 0}
            data-testid="button-select-all"
          >
            <CheckCheck className="w-4 h-4 mr-2 text-primary" />
            Wszyscy obecni
          </Button>

          {/* Save Button */}
          <Button
            type="button"
            onClick={onSave}
            disabled={!hasChanges || isSaving || !selectedGroup}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </div>
      </div>
    </div>
  );
}

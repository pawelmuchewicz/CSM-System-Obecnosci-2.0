import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck } from "lucide-react";
import { fetchInstructorsForGroup } from "@/lib/api";

interface InstructorsSectionProps {
  groupId: string;
}

export function InstructorsSection({ groupId }: InstructorsSectionProps) {
  const { data: instructorsData, isLoading } = useQuery({
    queryKey: ['/api/instructors/group', groupId],
    queryFn: () => fetchInstructorsForGroup(groupId),
    enabled: !!groupId,
  });

  const instructors = instructorsData?.instructors || [];

  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <Users className="w-4 h-4 mr-2" />
        <span>Ładowanie instruktorów...</span>
      </div>
    );
  }

  if (instructors.length === 0) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <Users className="w-4 h-4 mr-2" />
        <span>Brak przypisanych instruktorów</span>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-3">
      <div className="flex items-center text-sm text-gray-700 mb-2">
        <UserCheck className="w-4 h-4 mr-2" />
        <span className="font-medium">Instruktorzy grupy:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {instructors.map((instructor) => (
          <div
            key={instructor.id}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            data-testid={`instructor-${instructor.id}`}
          >
            <span>
              {instructor.first_name} {instructor.last_name}
            </span>
            {instructor.role && (
              <span className="ml-1 text-blue-600 font-semibold">
                ({instructor.role})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
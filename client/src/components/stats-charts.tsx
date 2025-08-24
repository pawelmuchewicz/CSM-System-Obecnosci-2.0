import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GroupStats, StudentStats } from '@shared/schema';

interface StatsChartsProps {
  groupStats: GroupStats[];
  studentStats: StudentStats[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function StatsCharts({ groupStats, studentStats }: StatsChartsProps) {
  // Prepare data for group attendance chart
  const groupChartData = groupStats.map(group => ({
    name: group.group_name,
    obecni: group.presentSessions,
    nieobecni: group.absentSessions,
    procent: group.attendancePercentage
  }));

  // Prepare data for attendance distribution pie chart
  const totalPresent = groupStats.reduce((sum, group) => sum + group.presentSessions, 0);
  const totalAbsent = groupStats.reduce((sum, group) => sum + group.absentSessions, 0);
  const pieData = [
    { name: 'Obecni', value: totalPresent, color: '#10b981' },
    { name: 'Nieobecni', value: totalAbsent, color: '#ef4444' }
  ];

  // Top 5 students by attendance percentage
  const topStudents = [...studentStats]
    .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
    .slice(0, 5)
    .map(student => ({
      name: student.student_name.split(' ').map(n => n[0]).join(''), // Initials for shorter labels
      fullName: student.student_name,
      procent: student.attendancePercentage,
      obecni: student.presentSessions,
      nieobecni: student.absentSessions
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Group Attendance Bar Chart */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Obecność według grup</CardTitle>
          <CardDescription>
            Porównanie obecności między różnymi grupami
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="obecni" stackId="a" fill="#10b981" name="Obecni" />
                <Bar dataKey="nieobecni" stackId="a" fill="#ef4444" name="Nieobecni" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Rozkład obecności</CardTitle>
          <CardDescription>
            Ogólny podział na obecnych i nieobecnych
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Students Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Najlepsza frekwencja</CardTitle>
          <CardDescription>
            Top 5 studentów z najwyższą obecnością
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topStudents} layout="horizontal" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={40} />
                <Tooltip 
                  labelFormatter={(label) => {
                    const student = topStudents.find(s => s.name === label);
                    return student ? student.fullName : label;
                  }}
                  formatter={(value: number) => [`${value}%`, 'Obecność']}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="procent" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Group Percentage Comparison */}
      {groupStats.length > 1 && (
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Procent obecności według grup</CardTitle>
            <CardDescription>
              Liniowy wykres porównujący procentową obecność między grupami
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={groupChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Obecność']}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="procent" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
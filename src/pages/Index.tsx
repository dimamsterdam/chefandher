
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, Save } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Index = () => {
  const { name, guestCount, prepDays, courses, setName, setGuestCount, setPrepDays, addCourse } = useMenuStore();
  const [newCourseTitle, setNewCourseTitle] = useState("");

  const handleAddCourse = () => {
    if (!newCourseTitle.trim()) {
      toast.error("Please enter a course title");
      return;
    }
    addCourse({
      title: newCourseTitle,
      order: courses.length,
    });
    setNewCourseTitle("");
    toast.success("Course added successfully");
  };

  const handleSave = () => {
    if (!name) {
      toast.error("Please enter a menu name");
      return;
    }
    if (courses.length === 0) {
      toast.error("Please add at least one course");
      return;
    }
    toast.success("Menu saved successfully");
    // TODO: Implement save functionality with Supabase
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-xl p-8 max-w-4xl mx-auto"
        >
          <h1 className="text-3xl font-bold mb-6">Menu Planning</h1>
          
          {/* Menu Details */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2">Menu Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter menu name (e.g., Christmas Menu)"
                className="max-w-md"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Number of Guests</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{guestCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(guestCount + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Preparation Days</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPrepDays(Math.max(1, prepDays - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{prepDays}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPrepDays(prepDays + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Courses */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Courses</h2>
            
            <div className="space-y-4">
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center space-x-4 p-4 glass rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-500">
                    {index + 1}.
                  </span>
                  <span className="flex-grow">{course.title}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Input
                type="text"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="Enter course title"
                className="flex-grow"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCourse();
                  }
                }}
              />
              <Button onClick={handleAddCourse}>
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8">
            <Button onClick={handleSave} className="w-full md:w-auto">
              <Save className="h-4 w-4 mr-2" />
              Save Menu
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;

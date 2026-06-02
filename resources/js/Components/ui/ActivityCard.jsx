// components/ActivityCard.jsx
import { Card, CardContent } from "@/Components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/Components/ui/avatar";

export function ActivityCard({ avatarUrl, avatarFallback, title, activities, date }) {
    return (
        <Card className="w-[380px]"> {/* Adjust width as needed */}
            <CardContent className="flex items-start p-4">
                <Avatar className="h-10 w-10 mr-4">
                    <AvatarImage src={avatarUrl} alt={avatarFallback} />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-base">{title}</h4>
                        <span className="text-xs text-gray-500">{date}</span>
                    </div>
                    <ul className="list-disc pl-4 text-sm text-gray-700">
                        {activities.map((activity, index) => (
                            <li key={index}>{activity}</li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}

// Example Usage:
/*
<ActivityCard
  avatarUrl="https://github.com/shadcn.png" // Replace with actual image or remove
  avatarFallback="RC"
  title="Recent Activity"
  activities={[
    "User login",
    "Data updated",
    "Report generated"
  ]}
  date="Oct 26, 2023"
/>
*/
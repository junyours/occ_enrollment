// components/KPICard.jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/Components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react"; // Correct import for Lucide icons

export function KPICard({ title, value, subText, trend, trendPercentage }) {
    const isPositiveTrend = trend === "positive"; // Can be 'positive', 'negative', 'neutral'
    const isNegativeTrend = trend === "negative";

    return (
        <Card className="w-[250px]"> {/* Adjust width as needed */}
            <CardHeader className="pb-2">
                <CardDescription>{title}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-end space-x-2">
                    <CardTitle className="text-4xl font-bold">{value}</CardTitle>
                    {trend && (
                        <div className={`flex items-center text-sm font-medium ${isPositiveTrend ? 'text-green-500' : isNegativeTrend ? 'text-red-500' : 'text-gray-500'}`}>
                            {isPositiveTrend && <ArrowUp className="h-4 w-4 mr-1" />}
                            {isNegativeTrend && <ArrowDown className="h-4 w-4 mr-1" />}
                            <span>{trendPercentage}</span>
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{subText}</p>
            </CardContent>
        </Card>
    );
}

// Example Usage:
/*
<KPICard
  title="New Users Today"
  value="12,450"
  subText="From yesterday"
  trend="positive"
  trendPercentage="+2.5%"
/>
*/
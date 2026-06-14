import { Metadata } from "next";
import AnalyticsClientPage from "./AnalyticsClientPage";

export const metadata: Metadata = {
  title: "التحليلات الشاملة | TREX",
};

export default function AnalyticsPage() {
  return <AnalyticsClientPage />;
}

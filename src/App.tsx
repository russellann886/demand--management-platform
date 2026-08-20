import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DemandWorkbench from "@/pages/DemandWorkbench";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DemandWorkbench />} />
        <Route path="/integration" element={<DemandWorkbench />} />
        <Route path="*" element={<DemandWorkbench />} />
      </Routes>
    </Router>
  );
}

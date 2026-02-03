import React from "react";
import { createRoot } from "react-dom/client";
import markers from "../pizzaz/markers.json";
import { PlusCircle, Star } from "lucide-react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

function App() {
  return (
    <div>
      <h1>Hello world!</h1>
      <Button color="primary" variant="solid" size="md">
        click me
      </Button>
    </div>
  );
}

createRoot(document.getElementById("hello-world-root")).render(<App />);
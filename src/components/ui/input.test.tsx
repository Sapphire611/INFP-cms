import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./input";

function ControlledInput() {
  const [value, setValue] = React.useState("initial");
  return (
    <Input
      type="text"
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        setValue(e.target.value)
      }
    />
  );
}

describe("Input Component", () => {
  it("renders controlled input with initial value", () => {
    render(<ControlledInput />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("initial");
  });

  it("updates controlled input on change", () => {
    render(<ControlledInput />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "updated" } });
    expect(input).toHaveValue("updated");
  });

  it("renders uncontrolled input with defaultValue", () => {
    render(<Input type="text" defaultValue="initial" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("initial");
  });

  it("updates uncontrolled input on change", () => {
    render(<Input type="text" defaultValue="initial" />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "updated" } });
    expect(input).toHaveValue("updated");
  });
});

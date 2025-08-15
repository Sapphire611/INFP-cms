import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './input';

describe('Input Component', () => {
  test('should work as controlled input', () => {
    const [value, setValue] = useState('initial');
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    };

    render(
      <Input
        type="text"
        value={value}
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('initial');

    fireEvent.change(input, { target: { value: 'updated' } });
    expect(input).toHaveValue('updated');
  });

  test('should work as uncontrolled input', () => {
    render(
      <Input
        type="text"
        defaultValue="initial"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('initial');

    fireEvent.change(input, { target: { value: 'updated' } });
    expect(input).toHaveValue('updated');
  });

  test('should not switch between controlled and uncontrolled', () => {
    const { rerender } = render(
      <Input
        type="text"
        defaultValue="initial"
      />
    );

    // Attempt to switch to controlled
    rerender(
      <Input
        type="text"
        value="controlled"
      />
    );

    // Should still behave as uncontrolled (this would fail if it tried to switch)
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('initial');
  });
});
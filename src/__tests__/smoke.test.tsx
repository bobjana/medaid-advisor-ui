import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Smoke Test', () => {
  it('renders a div with text', () => {
    render(<div>Hello MedAid</div>);
    expect(screen.getByText('Hello MedAid')).toBeInTheDocument();
  });
});
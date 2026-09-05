"use client";

import { Component, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface Props {
  pageNumber: number;
  onSkip: () => void;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Isolates render crashes to a single PDF page (corrupt fonts, XObjects,
 * browser-specific canvas failures). Without this, one bad page takes down
 * the entire reader route. Parent must pass key={pageNumber} so the
 * boundary resets when the slot is reused for another page.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`Page ${this.props.pageNumber} render failed:`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-white px-6 py-14 text-center"
        >
          <p className="font-serif text-lg text-ink">
            Halaman {this.props.pageNumber} tidak bisa ditampilkan.
          </p>
          <button
            type="button"
            onClick={this.props.onSkip}
            className="inline-flex h-11 items-center gap-1 rounded-full border border-line px-5 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Lanjut ke halaman {this.props.pageNumber + 1}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

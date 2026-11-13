import { Component, type ErrorInfo, type ReactNode } from "react";
import { Brand } from "./brand";
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("RentEase page error", error, info.componentStack);
  }
  handleRejection = (event: PromiseRejectionEvent) => {
    if (String(event.reason).includes("INTERNAL ASSERTION FAILED")) {
      this.setState({ failed: true });
      event.preventDefault();
    }
  };
  componentDidMount() {
    window.addEventListener("unhandledrejection", this.handleRejection);
  }
  componentWillUnmount() {
    window.removeEventListener("unhandledrejection", this.handleRejection);
  }
  render() {
    if (this.state.failed)
      return (
        <div className="min-h-svh grid place-items-center p-6">
          <section
            role="alert"
            className="max-w-md rounded-2xl border bg-card p-8 space-y-5"
          >
            <Brand />
            <h1 className="text-2xl font-semibold">Let’s get you back home.</h1>
            <p className="text-sm text-muted-foreground">
              This page lost its connection or encountered an unexpected error.
              Reload to reconnect. Your saved records are unchanged.
            </p>
            <button
              className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Reload RentEase
            </button>
          </section>
        </div>
      );
    return this.props.children;
  }
}

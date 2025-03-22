"use client";

import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-500 text-center p-4">
          <p>
            Đã xảy ra lỗi:{" "}
            {process.env.NODE_ENV === "development"
              ? this.state.error?.message
              : "Vui lòng thử lại sau."}
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre className="text-sm mt-2">{this.state.error?.stack}</pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-2 p-2 bg-blue-500 text-white rounded"
          >
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

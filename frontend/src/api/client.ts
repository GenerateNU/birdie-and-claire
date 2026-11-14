import { supabase } from "@/lib/supabase";

import { client } from "@/api/generated/client.gen";
import type { ErrorModel } from "@/api/generated/types.gen";

type ProblemFields = Pick<ErrorModel, "detail" | "title" | "errors">;

/** A non-2xx answer from our API, with the problem+json fields huma sent. */
class ApiError extends Error {
  readonly status: number;
  readonly detail: ErrorModel["detail"];
  readonly title: ErrorModel["title"];
  readonly errors: ErrorModel["errors"];

  constructor(response: Response, problem: ProblemFields) {
    super(problem.detail ?? `${response.status} ${response.statusText}`);
    this.status = response.status;
    this.detail = problem.detail;
    this.title = problem.title;
    this.errors = problem.errors;
  }
}

// The generated SDK sets `security` only on operations the spec marks as needing a token, so public
// ones like the shared outfit go out without one, even signed in.
client.interceptors.request.use(async (request, options) => {
  if (!options.security) {
    return request;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("not signed in");
  }

  request.headers.set("Authorization", `Bearer ${session.access_token}`);

  return request;
});

// The generated client throws the parsed response body, which isn't an Error. openapi-ts.config.ts
// tells the generated types every error has a message, and this is what makes that true.
client.interceptors.error.use((error, response) => {
  if (error instanceof Error) {
    return error;
  }

  if (response === undefined) {
    return new Error(String(error));
  }

  // SAFETY: huma answers every error as an ErrorModel. A body from something in front of the API,
  // like a proxy's HTML page, has none of its fields, and the message falls back to the status line.
  return new ApiError(response, error as ProblemFields);
});

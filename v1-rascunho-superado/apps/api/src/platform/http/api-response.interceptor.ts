import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, type Observable } from "rxjs";

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  public intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === "object" && "success" in data) return data;
        return { success: true, data, error: null };
      }),
    );
  }
}

package ERP.Software.demo.common.exception;

import java.time.LocalDateTime;

public record ApiError(LocalDateTime timestamp, int status, String message, String path) {
}

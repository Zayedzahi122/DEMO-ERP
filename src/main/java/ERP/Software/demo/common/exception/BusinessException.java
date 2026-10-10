package ERP.Software.demo.common.exception;

/**
 * Thrown when a request tries to reach data belonging to a different business.
 * Answers 403 so the caller knows the row exists but is not theirs - the same
 * rule a super admin uses when no business is selected.
 *
 * <p>Does not extend {@code ResponseStatusException} so that our
 * {@code GlobalExceptionHandler} can format the response consistently.
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
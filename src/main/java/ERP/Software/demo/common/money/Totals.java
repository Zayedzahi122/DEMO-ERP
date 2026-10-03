package ERP.Software.demo.common.money;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Invoice money maths shared by the sales, purchase and quotation services, so
 * all three round identically and none of them can produce a negative total.
 */
public final class Totals {

    private Totals() {
    }

    /**
     * @param subtotal sum of the line totals
     * @param discount discount to apply; a negative value is treated as zero and
     *                 anything above the subtotal is capped
     * @param vatRate  tax as a fraction, e.g. {@code 0.05} for 5%
     * @param scale    decimal places to round money to
     */
    public static Result of(BigDecimal subtotal, BigDecimal discount, BigDecimal vatRate, int scale) {
        BigDecimal sub = subtotal != null ? subtotal : BigDecimal.ZERO;
        BigDecimal disc = discount != null ? discount : BigDecimal.ZERO;
        if (disc.signum() < 0) {
            disc = BigDecimal.ZERO;
        }
        if (disc.compareTo(sub) > 0) {
            disc = sub;
        }

        BigDecimal taxable = sub.subtract(disc);
        BigDecimal tax = taxable
                .multiply(vatRate != null ? vatRate : BigDecimal.ZERO)
                .setScale(scale, RoundingMode.HALF_UP);

        return new Result(sub, disc, tax, taxable.add(tax).setScale(scale, RoundingMode.HALF_UP));
    }

    public record Result(BigDecimal subtotal, BigDecimal discount, BigDecimal taxAmount, BigDecimal totalAmount) {
    }
}

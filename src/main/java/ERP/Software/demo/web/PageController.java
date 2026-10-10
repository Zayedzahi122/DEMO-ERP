package ERP.Software.demo.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping({"/pos", "/sales", "/quotations", "/purchases", "/products",
            "/inventory", "/customers", "/suppliers", "/expenses",
            "/reports", "/payments", "/users", "/settings", "/invoice", "/login",
            "/super-admin"})
    public String forwardPage(HttpServletRequest req) {
        return "forward:" + req.getRequestURI() + ".html";
    }

    @GetMapping("/index")
    public String index() {
        return "forward:/index.html";
    }
}
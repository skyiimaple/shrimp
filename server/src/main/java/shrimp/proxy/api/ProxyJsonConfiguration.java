package shrimp.proxy.api;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.StreamReadConstraints;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProxyJsonConfiguration {
    @Bean
    Jackson2ObjectMapperBuilderCustomizer rejectDuplicateJsonFields() {
        var constraints = StreamReadConstraints.builder()
                .maxNestingDepth(100)
                .maxStringLength(1_048_576)
                .maxNumberLength(1000)
                .maxNameLength(1024)
                .build();
        return builder -> builder
                .featuresToEnable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                .postConfigurer(mapper -> mapper.getFactory().setStreamReadConstraints(constraints));
    }
}

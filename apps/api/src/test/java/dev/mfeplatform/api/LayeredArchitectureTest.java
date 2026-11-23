package dev.mfeplatform.api;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

import org.junit.jupiter.api.Test;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;

/**
 * 三層式架構的自動檢查：依賴方向只能是 controller → service → repository。
 * 違反時測試失敗，避免分層隨著修改慢慢被打破。
 */
class LayeredArchitectureTest {

	private static final JavaClasses CLASSES = new ClassFileImporter()
			.withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
			.importPackages("dev.mfeplatform.api");

	@Test
	void layersOnlyDependDownwards() {
		layeredArchitecture()
				.consideringOnlyDependenciesInLayers()
				.layer("Controller").definedBy("..controller..")
				.layer("Admin").definedBy("..admin..")
				.layer("Service").definedBy("..service..")
				.layer("Repository").definedBy("..repository..")
				.whereLayer("Controller").mayNotBeAccessedByAnyLayer()
				.whereLayer("Admin").mayNotBeAccessedByAnyLayer()
				.whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Admin")
				.whereLayer("Repository").mayOnlyBeAccessedByLayers("Service")
				.check(CLASSES);
	}

	@Test
	void controllersDoNotAccessRepositories() {
		noClasses().that().resideInAPackage("..controller..")
				.should().dependOnClassesThat().resideInAnyPackage("..repository..")
				.check(CLASSES);
	}

	@Test
	void repositoriesOnlyKnowModels() {
		noClasses().that().resideInAPackage("..repository..")
				.should().dependOnClassesThat().resideInAnyPackage("..dto..", "..service..", "..controller..")
				.check(CLASSES);
	}

	@Test
	void modelsDoNotDependOnOtherLayers() {
		noClasses().that().resideInAPackage("..model..")
				.should().dependOnClassesThat()
				.resideInAnyPackage("..dto..", "..controller..", "..service..", "..repository..")
				.check(CLASSES);
	}
}

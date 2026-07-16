import { Menu, Button, Portal, Box, Text } from "@chakra-ui/react";
import { LANGUAGE_VERSIONS } from "../constants.js";

const languages = Object.entries(LANGUAGE_VERSIONS);
const ACTIVE_COLOR = "blue.400";

function LanguageSelector({ language, onSelect }) {
  return (
    <Box ml={2} mb={4}>
      <Text mb={2} fontSize="lg">
        Language:
      </Text>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button variant="outline" size="sm">
            {language}
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content bg="#110c1b">
              {languages.map(([lang, version]) => (
                <Menu.Item
                  key={lang}
                  value={lang}
                  color={lang === language ? ACTIVE_COLOR : ""}
                  bg={lang === language ? "gray.900" : "transparent"}
                  _hover={{ color: ACTIVE_COLOR, bg: "gray.900" }}
                  onClick={() => onSelect(lang)}
                >
                  {lang}
                  <Text as="span" color="gray.600" fontSize="sm" ml={2}>
                    {version}
                  </Text>
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Box>
  );
}

export default LanguageSelector;

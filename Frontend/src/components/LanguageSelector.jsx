import { Menu, Button, Portal, Box, Text } from "@chakra-ui/react";
import { LANGUAGE_VERSIONS } from "../constants.js";

const languages = Object.entries(LANGUAGE_VERSIONS);
const ACTIVE_COLOR = "blue.300";

function LanguageSelector({ language, onSelect }) {
  return (
    <Box mb={4}>
      <Text mb={2} fontSize="lg" color="gray.300">
        Language:
      </Text>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            variant="outline"
            size="sm"
            bg="#110c1b"
            color="gray.100"
            borderColor="gray.700"
            _hover={{ bg: "gray.800", borderColor: "gray.600" }}
            _active={{ bg: "gray.800" }}
            _open={{ bg: "gray.800", color: "white", borderColor: ACTIVE_COLOR }}
          >
            {language}
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content bg="#110c1b" borderColor="gray.700" borderWidth="1px">
              {languages.map(([lang, version]) => (
                <Menu.Item
                  key={lang}
                  value={lang}
                  color={lang === language ? ACTIVE_COLOR : "gray.300"}
                  bg={lang === language ? "gray.800" : "transparent"}
                  _hover={{ color: ACTIVE_COLOR, bg: "gray.800" }}
                  _highlighted={{ color: ACTIVE_COLOR, bg: "gray.800" }}
                  onClick={() => onSelect(lang)}
                >
                  {lang}
                  <Text as="span" color="gray.500" fontSize="sm" ml={2}>
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

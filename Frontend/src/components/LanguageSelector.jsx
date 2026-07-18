import { Menu, Button, Portal, Box, Text } from "@chakra-ui/react";
import { LANGUAGE_VERSIONS } from "../constants.js";

const languages = Object.entries(LANGUAGE_VERSIONS);
const ACTIVE_COLOR = "#3b82f6";

function LanguageSelector({ language, onSelect }) {
  return (
    <Box mb={4}>
      <Text mb={2} fontSize="lg" color="#8a8a93">
        Language:
      </Text>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            variant="outline"
            size="sm"
            bg="#0b0b0e"
            color="#e6e6ea"
            borderColor="#1e1e22"
            _hover={{ bg: "#1a1a1f", borderColor: "#2a2a30" }}
            _active={{ bg: "#1a1a1f" }}
            _open={{ bg: "#1a1a1f", color: "white", borderColor: ACTIVE_COLOR }}
          >
            {language}
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content bg="#0b0b0e" borderColor="#1e1e22" borderWidth="1px">
              {languages.map(([lang, version]) => (
                <Menu.Item
                  key={lang}
                  value={lang}
                  color={lang === language ? ACTIVE_COLOR : "#c9c9d0"}
                  bg={lang === language ? "#1a1a1f" : "transparent"}
                  _hover={{ color: ACTIVE_COLOR, bg: "#1a1a1f" }}
                  _highlighted={{ color: ACTIVE_COLOR, bg: "#1a1a1f" }}
                  onClick={() => onSelect(lang)}
                >
                  {lang}
                  <Text as="span" color="#8a8a93" fontSize="sm" ml={2}>
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
